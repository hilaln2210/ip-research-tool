# IP Research — כלי מחקר כתובות IP

© 2025 Hila · [MIT License](LICENSE)

ממשק לניתוח וסיווג כתובות IP — בדיקת IP בודד או סריקה מרובה (Bulk).

## תכונות

- **ניתוח IP בודד** — סיווג, ציון (Score), רקע (ASN, RIR), Threat Intel (AbuseIPDB, Shodan, VirusTotal), ואפשרות Lookup
- **סריקה מרובה (Bulk)** — עד 20 כתובות IP בפעם אחת, סיווג בלבד (ללא Lookup) + ייצוא CSV
- ממשק כהה ופשוט עם React
- Backend ב־FastAPI עם Swagger UI

## צילומי מסך

### ניתוח IP בודד (Single IP)

![ניתוח IP בודד](screenshots/ip-research-single.png)

### סריקה מרובה (Bulk Scan)

![סריקה מרובה](screenshots/ip-research-bulk.png)

## דרישות מקדימות

- **Python 3.12+** עם `venv`
- **Node.js** ו־npm
- **ללא מפתחות**: Basic (ip-api) + AlienVault OTX פועלים out-of-the-box
- (אופציונלי) מפתחות ב־`backend/.env` — ראה `backend/.env.example` — AbuseIPDB, Shodan, VirusTotal, OTX

## הרצה

```bash
# הפעלה (Backend + Frontend)
./start.sh

# עצירה
./stop.sh
```

לאחר ההפעלה:
- **Frontend** → http://localhost:3003
- **Backend API** → http://localhost:8003
- **Swagger UI** → http://localhost:8003/docs

## הרצה ידנית

```bash
# Backend
cd backend
source venv/bin/activate
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --app-dir .

# Frontend (טרמינל נפרד)
cd frontend
npm install
npm run dev   # פורט 3000 או לפי הגדרות vite.config.js
```

## מבנה הפרויקט

```
IPResearch/
├── backend/           # FastAPI
│   ├── app/
│   │   ├── api/
│   │   ├── services/
│   │   └── main.py
│   └── requirements.txt
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── IPAnalyzer.jsx    # Single IP
│   │   │   └── BulkAnalyzer.jsx  # Bulk Scan
│   │   └── App.jsx
│   └── package.json
├── screenshots/
├── start.sh
├── stop.sh
└── README.md
```

## API עיקרי

| Endpoint | תיאור |
|----------|--------|
| `POST /api/classify` | סיווג IP (Public/Private/etc) |
| `POST /api/score` | ציון ייחודיות ואיומים |
| `POST /api/attribute` | מאפיינים (ASN, RIR, Country) |
| `POST /api/lookup` | Lookup מלא (כולל WHOIS) |

## רישיון

MIT License — ראה [LICENSE](LICENSE).
