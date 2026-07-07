# Flos Fitness

Private Trainings- und Fitness-App als statische Web-App. Sie läuft ohne Backend direkt im Browser und speichert Trainingsdaten lokal per `localStorage`.

## Funktionen

- Trainingseinheiten mit Datum, Fokus, Übungen, Sätzen, Wiederholungen und Gewicht erfassen
- Übungskatalog erweitern
- Wochenstatistik, Trainingsvolumen und Streak anzeigen
- Verlauf durchsuchen
- Trainingsdaten als JSON exportieren/importieren
- Installierbar als einfache PWA auf Smartphone oder Desktop

## Start lokal

```bash
python3 -m http.server 8080
```

Danach öffnen:

```text
http://localhost:8080
```

## Datenhinweis

Die App speichert deine Trainingsdaten nur lokal im Browser. Wenn du Browserdaten löschst oder ein anderes Gerät nutzt, sind die Daten dort nicht automatisch verfügbar. Nutze den JSON-Export als Backup.

## Nächste Ausbaustufen

1. Trainingspläne mit Kalender
2. Progression und Zielgewichte pro Übung
3. Diagramme pro Übung
4. Cloud-Sync mit Supabase
5. Login und Multi-Geräte-Sync
