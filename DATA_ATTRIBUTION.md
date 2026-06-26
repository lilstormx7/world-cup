# Data attribution

National team squads and tournament statistics are derived from the **Fjelstul World Cup Database** by Joshua C. Fjelstul, Ph.D.

- Source repository: https://github.com/jfjelstul/worldcup
- CSV files used: `squads`, `teams`, `qualified_teams`, `goals`, `tournaments`
- License: [Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)

**Player OVR** shown in draft and used for tournament simulation:

- **Primary:** [SoFIFA](https://sofifa.com/) / EA FC data via community CSV mirrors — [jsulz/FIFA23 on HuggingFace](https://huggingface.co/datasets/jsulz/FIFA23) (FIFA 15–23) and [SolideSpoke/sofifa-web-scraper](https://github.com/SolideSpoke/sofifa-web-scraper) (FC 24 snapshot)
- **Fallback:** Position-based squad floor (GK 66, DEF 68, MID 69, FWD 70) when no SoFIFA name match exists

Only **2014, 2018, and 2022** World Cup squads are available in the game (SoFIFA coverage window).

Lobby **Rating Scope** controls whether the year-specific OVR or career peak OVR is used.

To regenerate game data from the upstream sources:

```bash
npm run build:data
```

Use `--force-download` to refresh cached SoFIFA CSV files.
