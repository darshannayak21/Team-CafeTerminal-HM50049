import io
import os
import sqlite3
import sys

from backend.app import create_app
from backend.services.db import get_connection, init_db

def main():
    # 1. Reset DB to initial seeded state
    with get_connection() as conn:
        conn.cursor().execute("DELETE FROM reports")
        conn.commit()
    init_db()

    app = create_app()

    with app.test_client() as client:
        # TEST 1: Health check
        h = client.get('/api/health')
        assert h.status_code == 200 and h.get_json() == {'status': 'ok'}, f'Health check failed: {h.data}'
        print('[PASS] Test 1: Health check OK')

        # TEST 2: Initial reports test - exactly 1 initial report
        r0 = client.get('/api/reports')
        assert r0.status_code == 200
        reports_0 = r0.get_json()['reports']
        assert len(reports_0) == 1, f"Expected exactly 1 report in initial DB, got {len(reports_0)}"
        assert reports_0[0]['id'] == 'RG-20260927-PUNE01'
        print('[PASS] Test 2: Initial DB has exactly 1 report (RG-20260927-PUNE01)')

        # TEST 3 & 4: Submit real incident from mobile format (multipart/form-data)
        img_data = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00'
        sub_res = client.post('/api/reports', data={
            'incident_type': 'Road Blocked',
            'description': 'Tree fallen across road blocking lane near Katraj tunnel',
            'latitude': '18.4485',
            'longitude': '73.8580',
            'accuracy': '6.4',
            'location_name': 'Katraj Tunnel Road',
            'image': (io.BytesIO(img_data), 'incident_photo.jpg')
        }, content_type='multipart/form-data')
        assert sub_res.status_code == 201, f'Submission failed: {sub_res.get_json()}'
        report = sub_res.get_json()['report']
        report_id = report['id']
        img_url = report['image_url']
        print(f'[PASS] Test 3 & 4: Mobile submission succeeded with ID {report_id} and image {img_url}')

        # TEST 5 & 6: Query /api/reports (now exactly 2 reports) and retrieve image
        r1 = client.get('/api/reports')
        reports_1 = r1.get_json()['reports']
        assert len(reports_1) == 2, f'Expected 2 reports after submission, got {len(reports_1)}'
        assert any(r['id'] == report_id for r in reports_1)
        assert any(r['id'] == 'RG-20260927-PUNE01' for r in reports_1)
        img_res = client.get(img_url)
        assert img_res.status_code == 200 and img_res.data == img_data, 'Image serving failed'
        print('[PASS] Test 5 & 6: Total 2 reports and uploaded image retrieved via API')

        # TEST 7: News check - exactly ONE item
        news_res = client.get('/api/news')
        news_data = news_res.get_json()
        assert news_data['count'] == 1, f'Expected 1 news item, got {news_data["count"]}'
        assert news_data['news'][0]['title'] == 'Traffic disruption reported near Navale Bridge'
        assert news_data['news'][0]['source'] == 'News'
        print(f'[PASS] Test 7: Exactly 1 News item: "{news_data["news"][0]["title"]}"')

    # TEST 8: Persistence after fresh restart/connection (all 2 reports still intact)
    app_restart = create_app()
    with app_restart.test_client() as client_restart:
        persisted = client_restart.get(f'/api/reports/{report_id}')
        assert persisted.status_code == 200
        assert persisted.get_json()['report']['incident_type'] == 'Road Blocked'
        all_persisted = client_restart.get('/api/reports')
        assert len(all_persisted.get_json()['reports']) == 2
        print(f'[PASS] Test 8: Persistence verified after restart: all 2 reports are intact!')

    print('\n========================================')
    print('ALL 8 INTEGRATION TESTS PASSED 100%!')
    print('========================================')

if __name__ == '__main__':
    main()
