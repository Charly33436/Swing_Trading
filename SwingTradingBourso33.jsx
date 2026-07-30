import React, { useState } from "react";
import * as XLSX from "xlsx";

function SwingTradingBourso33() {
  // 👉 URL "raw" GitHub du fichier Excel — remplace-la ici quand tu mets à jour
  // le fichier (upload un nouveau .xlsx portant le même nom dans le dépôt,
  // sans jamais avoir besoin de redéployer l'application).
  const DATA_FILE_URL =
    "https://raw.githubusercontent.com/Charly33436/Swing_Trading/main/Twitter_Donnees.xlsx";

  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔥 Code valide = 2 à 6 caractères alphanumériques, sans espace
  const isValidCode = code =>
    typeof code === "string" &&
    /^[A-Za-z0-9]{2,6}$/.test(code.trim());

  // 🔥 Valeur valide = non vide, 1 à 3 mots max
  const isValidValue = valeur =>
    typeof valeur === "string" &&
    valeur.trim().length > 0 &&
    valeur.trim().split(" ").length <= 3;

  // 🔥 Marché valide = chaîne non vide (ou vide toléré, mais typé correctement)
  const isValidMarche = marche =>
    marche === undefined || marche === null || typeof marche === "string";

  // 🔥 Nombre valide
  const isValidNumber = n =>
    typeof n === "number" || (!isNaN(parseFloat(n)));

  // Dans ce fichier, chaque section commence par une ligne d'en-tête structurelle
  // reconnaissable par ses libellés fixes : "Code" (col 1), "Marché" (col 2),
  // "Valeur" (col 3), "RECO" (col 5), "Différence" (col 6).
  // Le titre de la section se trouve dans la colonne 7 (ex: "Les valeurs qui
  // montent 📈 avec des volumes 👍:", "Conseil+", "Etoiles ", etc.)
  const isSectionHeaderRow = row =>
    row[1] === "Code" &&
    row[2] === "Marché" &&
    row[3] === "Valeur" &&
    row[5] === "RECO" &&
    row[6] === "Différence";

  const getSectionLabel = (row, fallbackIndex) => {
    if (!isSectionHeaderRow(row)) return null;
    const rawTitle = row[7];
    if (typeof rawTitle === "string" && rawTitle.trim().length > 0) {
      return rawTitle.trim();
    }
    // Titre manquant ou non textuel (ex: 0) : on donne un nom de repli lisible
    return `Section ${fallbackIndex}`;
  };

  const loadExcel = async () => {
    setLoading(true);
    setError(null);
    try {
      // Le paramètre ?t=... évite que le navigateur ou un CDN serve une
      // version en cache du fichier au lieu de la dernière que tu as uploadée
      const res = await fetch(`${DATA_FILE_URL}?t=${Date.now()}`);
      if (!res.ok) {
        throw new Error(`Impossible de récupérer le fichier (statut ${res.status})`);
      }
      const buffer = await res.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames.find(n =>
        n.toLowerCase().includes("don")
      );

      if (!sheetName) {
        throw new Error("Aucune feuille contenant des données n'a été trouvée.");
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const parsed = {};
      let currentSection = null;
      let sectionCount = 0;

      rows.forEach(row => {
        const label = getSectionLabel(row, sectionCount + 1);

        if (label) {
          sectionCount += 1;
          // Évite d'écraser une section si le même titre apparaît deux fois
          currentSection = parsed[label] ? `${label} (${sectionCount})` : label;
          parsed[currentSection] = [];
          return;
        }

        if (!currentSection) return;

        const code = row[1];
        const marche = row[2];
        const valeur = row[3];
        const cours = row[4];
        const reco = row[5];
        const diff = row[6];

        // 🔥 Filtre ultra strict : supprimer toute ligne parasite
        if (!isValidCode(code)) return;
        if (!isValidValue(valeur)) return;
        if (!isValidMarche(marche)) return;
        if (!isValidNumber(cours)) return;
        if (!isValidNumber(reco)) return;

        parsed[currentSection].push({
          code: code.trim(),
          marche: marche ?? "",
          valeur,
          cours,
          reco,
          diff,
        });
      });

      // 🔥 Supprimer les tableaux vides
      const cleaned = {};
      Object.entries(parsed).forEach(([title, data]) => {
        if (data.length > 0) cleaned[title] = data;
      });

      if (Object.keys(cleaned).length === 0) {
        setError("Aucune donnée valide n'a été trouvée dans le fichier.");
      }

      setSections(cleaned);
    } catch (err) {
      console.error("Erreur de lecture Excel :", err);
      setError(err.message || "Une erreur est survenue lors de la lecture du fichier.");
      setSections({});
    } finally {
      setLoading(false);
    }
  };

  const thStyle = {
    padding: "12px",
    textAlign: "left",
    color: "#ddd",
    fontWeight: "bold",
    fontSize: "14px",
  };

  const tdStyle = {
    padding: "10px",
    color: "#eee",
    fontSize: "14px",
  };

  const renderTable = (title, data) => {
    const isMontent = title.toLowerCase().includes("montent");
    const isConfiance = title.toLowerCase().includes("confiance");
    const isConseil = title.toLowerCase().includes("conseil");
    const isEtoiles = title.toLowerCase().startsWith("etoiles");

    const color = isMontent || isConfiance || isConseil || isEtoiles ? "#4caf50" : "#f44336";
    const icon = isConseil || isEtoiles ? "⭐⭐" : isConfiance ? "⭐" : isMontent ? "📈" : "📉";

    return (
      <div key={title} style={{
        marginBottom: "2rem",
        background: "#1e1e1e",
        padding: "20px",
        borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}>
        <h2 style={{ color, marginBottom: "15px" }}>
          {icon} {title}
        </h2>

        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#2a2a2a",
          borderRadius: "8px",
          overflow: "hidden",
        }}>
          <thead>
            <tr style={{ backgroundColor: "#333" }}>
              <th style={thStyle}>Code</th>
              <th style={thStyle}>Marché</th>
              <th style={thStyle}>Valeur</th>
              <th style={thStyle}>Cours</th>
              <th style={thStyle}>RECO</th>
              <th style={thStyle}>Différence</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={`${r.code}-${i}`} style={{
                backgroundColor: i % 2 === 0 ? "#2f2f2f" : "#262626",
                transition: "0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#3a3a3a")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#2f2f2f" : "#262626")}
              >
                <td style={tdStyle}>{r.code}</td>
                <td style={tdStyle}>{r.marche}</td>
                <td style={tdStyle}>{r.valeur}</td>
                <td style={tdStyle}>{r.cours}</td>
                <td style={tdStyle}>{r.reco}</td>
                <td style={{
                  ...tdStyle,
                  color:
                    parseFloat(r.diff) > 0 ? "#4caf50" :
                      parseFloat(r.diff) < 0 ? "#f44336" :
                        "#bdbdbd",
                  fontWeight: "bold",
                }}>
                  {r.diff}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div translate="no" className="notranslate" style={{ padding: "30px", color: "white", fontFamily: "Arial" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
        <img
          src="/logo.jpg"
          alt="Swing Trading Bourso33"
          style={{ height: "56px", width: "56px", borderRadius: "8px", objectFit: "cover" }}
        />
        <h1 style={{ margin: 0 }}>Swing Trading Bourso33</h1>
      </div>

      <button
        onClick={loadExcel}
        disabled={loading}
        style={{
          padding: "12px 24px",
          marginBottom: "25px",
          backgroundColor: "#0078D4",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: "16px",
          fontWeight: "bold",
          boxShadow: "0 3px 8px rgba(0,0,0,0.3)",
          transition: "0.2s",
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={e => !loading && (e.currentTarget.style.backgroundColor = "#0a89e6")}
        onMouseLeave={e => !loading && (e.currentTarget.style.backgroundColor = "#0078D4")}
      >
        {loading ? "Chargement..." : "🔄 Rafraîchir les donnees"}
      </button>

      {error && (
        <div style={{
          background: "#3a1f1f",
          border: "1px solid #f44336",
          color: "#ff8a80",
          padding: "12px 16px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}>
          ⚠️ {error}
        </div>
      )}

      {!loading && !error && Object.keys(sections).length === 0 && (
        <div style={{ color: "#999" }}>
          Aucune donnée chargée pour le moment. Clique sur "Rafraîchir les donnees".
        </div>
      )}

      {Object.entries(sections).map(([title, data]) => renderTable(title, data))}
    </div>
  );
}

export default SwingTradingBourso33;
