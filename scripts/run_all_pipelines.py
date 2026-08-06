from datetime import datetime
import os
import re

import numpy as np
import pandas as pd
import psycopg2
from psycopg2 import extras
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

# 1. DATABASE CONFIGURATION
db_config = {
    'host': os.getenv('DB_HOST', '54.179.201.252'),
    'database': os.getenv('DB_NAME', 'new'),  # Diperbarui ke default 'new'
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'Dpb5eVJB3cx$@p%R9n7H'),
    'port': os.getenv('DB_PORT', '5432'),
}


def run_pipeline():
    print("=" * 60)
    print("STARTING AUTOMATED ML & NLP PIPELINE EXECUTION")
    print("=" * 60)

    try:
        print("Menghubungkan ke Database PostgreSQL...")
        conn = psycopg2.connect(**db_config)
        print("Koneksi PostgreSQL Berhasil!")

        # Load Data Raw dari PostgreSQL
        df_inquiry = pd.read_sql_query("SELECT * FROM inquiry;", conn)
        print(f"Total Inquiry Raw Ditemukan: {len(df_inquiry)} Baris.\n")

        # MODUL 1: AI LEAD SCORING & CUSTOMER INSIGHTS
        print("🚀 [1/3] Memulai Modul Lead Scoring & Topic Clustering...")

        def analyze_and_score_leads(df_inq):
            df = df_inq.copy()
            df['buying_intent'] = 'Netral (Warm)'
            df['topic_cluster'] = 'Eksplorasi Katalog Umum'
            df['lead_score'] = 50
            df['ai_reason'] = ''

            hot_keywords = [
                'ton',
                'tons',
                'container',
                'volume requirement',
                'large-scale',
                'purchase',
                'sourcing',
                'supply partnership',
            ]

            for index, row in df.iterrows():
                text_reason = str(row.get('reason_for_inquiry', '')).lower()
                text_product = str(row.get('product_inquiry', '')).lower()
                scale = str(row.get('industry_scale', '')).lower()
                industry = str(row.get('industry', '')).lower()

                score = 50
                reasons = []

                if any(kw in text_reason or kw in text_product for kw in hot_keywords):
                    df.at[index, 'buying_intent'] = 'Positif (Hot)'
                    score += 25
                    reasons.append(
                        'Terdeteksi volume skala besar / permintaan transaksi B2B'
                    )
                else:
                    reasons.append(
                        'Teks hanya memuat pertanyaan dasar/informasi produk awal'
                    )

                if scale == 'large':
                    score += 15
                    reasons.append('Profil skala industri: Large')
                elif scale == 'medium':
                    score += 5
                    reasons.append('Profil skala industri: Medium')

                if pd.notna(row.get('email')) and '@' in str(row['email']):
                    score += 5
                if pd.notna(row.get('phone')) and str(row['phone']) != 'nan':
                    score += 5

                if getattr(row, 'is_spam', 'f') == 't' or len(text_reason) < 15:
                    df.at[index, 'buying_intent'] = 'Negatif (Cold)'
                    score = 10
                    reasons.append('Terindikasi Spam / data kontak tidak lengkap')

                df.at[index, 'lead_score'] = int(np.clip(score, 0, 100))
                df.at[index, 'ai_reason'] = ' | '.join(reasons)

                if (
                    'cosmetic' in industry
                    or 'personal care' in industry
                    or 'shampoo' in text_reason
                    or 'surfactant' in text_reason
                ):
                    df.at[index, 'topic_cluster'] = 'Personal & Household Care'
                elif (
                    'food' in industry
                    or 'beverage' in industry
                    or 'pengembang' in text_reason
                ):
                    df.at[index, 'topic_cluster'] = 'Food & Beverages'
                elif (
                    'health' in industry
                    or 'pharma' in industry
                    or 'hygiene' in industry
                ):
                    df.at[index, 'topic_cluster'] = 'Healthcare & Hygiene'
                elif (
                    'coating' in text_reason
                    or 'paint' in text_reason
                    or 'resin' in text_reason
                    or 'industrial' in industry
                ):
                    df.at[index, 'topic_cluster'] = 'Industrial Solutions'
                elif (
                    'agri' in industry
                    or 'fertilizer' in industry
                    or 'animal' in industry
                ):
                    df.at[index, 'topic_cluster'] = 'Agriculture & Animal Nutrition'
                elif 'paper' in industry or 'export' in industry:
                    df.at[index, 'topic_cluster'] = 'Paper Packing & Export'

            return df[[
                'inquiry_id',
                'buying_intent',
                'topic_cluster',
                'lead_score',
                'ai_reason',
            ]]

        df_processed_insights = analyze_and_score_leads(df_inquiry)

        # Upsert data Insights ke Database via SQLAlchemy
        connection_url = URL.create(
            drivername='postgresql+psycopg2',
            username=db_config['user'],
            password=db_config['password'],
            host=db_config['host'],
            port=db_config['port'],
            database=db_config['database'],
        )
        engine = create_engine(connection_url)

        with engine.connect() as sql_conn:
            for _, row in df_processed_insights.iterrows():
                query = text("""
                    INSERT INTO ml_customer_insights (inquiry_id, buying_intent, topic_cluster, lead_score, ai_reason)
                    VALUES (:inquiry_id, :buying_intent, :topic_cluster, :lead_score, :ai_reason)
                    ON CONFLICT (inquiry_id)
                    DO UPDATE SET
                        buying_intent = EXCLUDED.buying_intent,
                        topic_cluster = EXCLUDED.topic_cluster,
                        lead_score = EXCLUDED.lead_score,
                        ai_reason = EXCLUDED.ai_reason,
                        updated_at = CURRENT_TIMESTAMP;
                """)
                sql_conn.execute(query, {
                    'inquiry_id': row['inquiry_id'],
                    'buying_intent': row['buying_intent'],
                    'topic_cluster': row['topic_cluster'],
                    'lead_score': row['lead_score'],
                    'ai_reason': row['ai_reason'],
                })
            sql_conn.commit()

        print(
            'Modul Lead Scoring Selesai! Data disimpan di'
            ' ml_customer_insights.\n'
        )

        # MODUL 2: ML TIME-SERIES LINEAR REGRESSION FORECASTING
        print("Memulai Modul ML Time-Series Forecast")

        df_time_inquiry = df_inquiry[
            df_inquiry['created_at'].notna()
        ].copy()
        df_time_inquiry['created_at'] = pd.to_datetime(
            df_time_inquiry['created_at']
        )
        df_time_inquiry['year_month'] = df_time_inquiry[
            'created_at'
        ].dt.to_period('M')

        business_units = [
            'Personal & Household Care',
            'Food & Beverages',
            'Industrial Solutions',
            'Healthcare & Hygiene',
            'Agriculture & Animal Nutrition',
            'Paper Packing & Export',
        ]

        # =========================================================================
        # 📌 BAGIAN YANG DIPERBARUI: PENENTUAN BULAN FORECAST SECARA DINAMIS
        # =========================================================================
        today = datetime.now()
        # Menghasilkan 3 bulan ke depan secara otomatis berbasis bulan berjalan
        future_dates = [today + pd.DateOffset(months=i) for i in range(1, 4)]
        future_months = [d.strftime('%Y-%m') for d in future_dates]
        # =========================================================================

        forecast_results = []

        for bu in business_units:
            main_term = bu.split('&')[0].split()[0].lower()
            bu_data = df_time_inquiry[
                df_time_inquiry['industry']
                .fillna('')
                .str.lower()
                .str.contains(main_term, regex=False)
            ]

            monthly_counts = (
                bu_data.groupby('year_month').size().reset_index(name='volume')
            )
            X = np.array(range(len(monthly_counts)))
            Y = monthly_counts['volume'].values

            if len(X) > 1:
                slope, intercept = np.polyfit(X, Y, 1)
            else:
                slope = 0
                intercept = max(len(bu_data), 1)

            last_x = len(X) - 1 if len(X) > 0 else 0
            for i, month_str in enumerate(future_months):
                target_x = last_x + (i + 1)
                predicted_vol = int(round(slope * target_x + intercept))
                predicted_vol = max(predicted_vol, 1)

                if slope > 0.5:
                    status = 'Naik Tajam'
                elif slope < -0.5:
                    status = 'Turun'
                else:
                    status = 'Stabil'

                forecast_results.append({
                    'business_unit': bu,
                    'forecast_date': f'{month_str}-01',
                    'predicted_volume': predicted_vol,
                    'trend_status': status,
                })

        df_forecast_final = pd.DataFrame(forecast_results)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ml_industry_forecast (
                id SERIAL PRIMARY KEY,
                business_unit VARCHAR(150),
                forecast_date DATE,
                predicted_volume INT,
                trend_status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()

        cursor.execute("TRUNCATE TABLE ml_industry_forecast;")
        conn.commit()

        insert_forecast_records = [
            (
                str(r['business_unit']),
                str(r['forecast_date']),
                int(r['predicted_volume']),
                str(r['trend_status']),
            )
            for _, r in df_forecast_final.iterrows()
        ]
        extras.execute_values(
            cursor,
            """
            INSERT INTO ml_industry_forecast (business_unit, forecast_date, predicted_volume, trend_status)
            VALUES %s
            """,
            insert_forecast_records,
        )
        conn.commit()

        print(
            'Modul Time-Series Selesai! Hasil disinkronkan ke'
            ' ml_industry_forecast.\n'
        )

        # 🔍 MODUL 3: NLP NER CHEMICAL PRODUCT ENTITY EXTRACTION
        print("🚀 [3/3] Memulai Modul Ekstraksi Entitas Produk NLP NER...")

        def extract_chemical_entities(text):
            if not text or pd.isna(text):
                return []
            clean_text = str(text).strip()
            pattern = r'[,;/]|\s+(?:dan|and|serta|dengan|\+)\s+'
            raw_entities = re.split(pattern, clean_text, flags=re.IGNORECASE)

            entities = []
            for item in raw_entities:
                cleaned_item = re.sub(r'[\(\)\[\]\{\}]', '', item).strip()
                lowered = cleaned_item.lower()
                if (
                    len(cleaned_item) > 2
                    and not lowered.startswith('seperti')
                    and not lowered.startswith('user')
                ):
                    entities.append(cleaned_item)
            return entities

        df_inquiry['extracted_products'] = df_inquiry['product_inquiry'].apply(
            extract_chemical_entities
        )
        df_exploded = df_inquiry.explode('extracted_products').dropna(
            subset=['extracted_products']
        )
        df_exploded['product_name'] = df_exploded['extracted_products'].str.strip()
        df_exploded = df_exploded[df_exploded['product_name'] != '']

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ml_extracted_products (
                id SERIAL PRIMARY KEY,
                inquiry_id VARCHAR(100),
                company VARCHAR(255),
                industry VARCHAR(150),
                product_name TEXT,
                extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()

        cursor.execute("TRUNCATE TABLE ml_extracted_products;")
        conn.commit()

        insert_ner_records = [
            (
                str(r.get('inquiry_id', '')),
                str(r.get('company', 'PT Corporate Client')),
                str(r.get('industry', 'General Industry')),
                str(r.get('product_name', '')),
            )
            for _, r in df_exploded.iterrows()
        ]
        extras.execute_values(
            cursor,
            """
            INSERT INTO ml_extracted_products (inquiry_id, company, industry, product_name)
            VALUES %s
            """,
            insert_ner_records,
        )
        conn.commit()

        print(
            'Modul NLP NER Selesai! Entire entitas disimpan di'
            ' ml_extracted_products.\n'
        )

        print("=" * 60)
        print("ALL ML & NLP PIPELINES EXECUTED SUCCESSFULLY!")
        print("=" * 60)

    except Exception as e:
        print(f"TERJADI EROR PADA PIPELINE: {e}")
    finally:
        if 'conn' in locals() and conn:
            cursor.close()
            conn.close()
            print("Koneksi Database Ditutup Bersih.")


if __name__ == '__main__':
    run_pipeline()