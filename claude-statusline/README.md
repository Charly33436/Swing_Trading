# Claude Code Status Line

Status line multiplateforme pour [Claude Code](https://claude.ai/code) : modèle, niveau d'effort, % de contexte, coût de session, durée, état git et rate limits. Aucune dépendance npm (Node.js ≥ 18 uniquement).

```
◆ Sonnet · high ●●●○○   📁 mon-projet   🌿 main +2 ~1
███████░░░ 68%  ·  💰 $1.87  ·  ⏱ 4m 12s  ·  ⏳ 5h ██████░░░░ 55%  ·  📅 7d ████████░░ 82%
```

## Installation

```bash
cd claude-statusline
node install.mjs            # global : ~/.claude/settings.json
node install.mjs --project  # projet : ./.claude/settings.json
```

Ou `bash install.sh` (macOS/Linux), `.\install.ps1` (Windows). L'installeur copie `statusline.js` dans `~/.claude/`, sauvegarde `settings.json` en `settings.json.bak`, puis ajoute la clé `statusLine`. Redémarrez Claude Code ou envoyez un message.

## Segments

| Segment | Signification |
|---|---|
| `◆ Sonnet` | Modèle actif |
| `· high ●●●○○` | Effort (`low` vert, `medium` cyan, `high` jaune, `xhigh` magenta, `max` rouge gras) |
| `📁 projet` | Dossier courant |
| `🌿 main +2 ~1 ?3` | Branche ; `+` indexés, `~` modifiés, `?` non suivis |
| `███████░░░ 68%` | Contexte utilisé : vert < 70 %, jaune 70–89 %, rouge ≥ 90 % |
| `💰 $1.87` | Coût estimé de la session |
| `⏱ 4m 12s` | Durée de la session |
| `⏳ 5h` / `📅 7d` | Rate limits 5 h / 7 jours (Pro/Max, après la première réponse API) |

## Configuration (variables d'environnement)

| Variable | Valeurs | Effet |
|---|---|---|
| `NO_COLOR` | non vide | Désactive les couleurs ANSI |
| `CCSL_NO_EMOJI` | `1` | Remplace les emojis par du texte |
| `CCSL_NERD_FONTS` | `1` | Icônes Nerd Font |
| `CCSL_HIDE` | `cost,duration,git,ratelimit,effort,context` | Masque des segments |
| `CCSL_BAR_WIDTH` | `4`–`40` | Largeur des barres (défaut `10`) |
| `CCSL_LINES` | `1` ou `2` | Une ou deux lignes (défaut 2) |
| `CCSL_DEBUG` | `1` | Affiche les erreurs sur stderr |

Exemple dans `settings.json` :

```json
{
  "statusLine": {
    "type": "command",
    "command": "CCSL_HIDE=ratelimit CCSL_NERD_FONTS=1 node \"/home/vous/.claude/statusline.js\"",
    "padding": 0
  }
}
```

## Aperçu, mise à jour, désinstallation

```bash
node test.mjs          # aperçu sans Claude Code (ou npm run preview)
node install.mjs       # relancer = mise à jour
node uninstall.mjs     # retire statusLine de settings.json
```

## Fonctionnement

Claude Code envoie un objet JSON sur stdin à chaque rafraîchissement ; le script le parse et écrit une ou deux lignes colorées sur stdout. Les appels git sont mis en cache 5 s dans un fichier temporaire pour rester rapide.
