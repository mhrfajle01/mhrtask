import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { doc, collection, getDocs, writeBatch, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import ConfirmationModal from "../components/ConfirmationModal";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Settings = () => {
  const { currentUser, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const fileInputRef = useRef(null);
  const reportTemplateRef = useRef(null);

  const handleExport = async () => {
    setLoading(true);
    try {
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        stats: userData,
        routines: [],
        todos: [],
        journal: [],
        notifications: []
      };

      const collections = ["routines", "todos", "journal", "notifications"];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, "users", currentUser.uid, colName));
        exportData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mhrtask_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export error", e);
      alert("Failed to export data.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.stats || !data.version) throw new Error("Invalid format");

        if (!window.confirm("This will overwrite your current progress. Continue?")) return;

        setLoading(true);
        const batch = writeBatch(db);

        // Update stats
        const userRef = doc(db, "users", currentUser.uid);
        batch.set(userRef, data.stats);

        // Update sub-collections (Delete existing first or just add new)
        const collections = ["routines", "todos", "journal", "notifications"];
        for (const colName of collections) {
          const oldSnap = await getDocs(collection(db, "users", currentUser.uid, colName));
          oldSnap.docs.forEach(d => batch.delete(d.ref));
          
          if (data[colName]) {
            data[colName].forEach(item => {
              const { id, ...rest } = item;
              const newRef = doc(collection(db, "users", currentUser.uid, colName));
              batch.set(newRef, rest);
            });
          }
        }

        await batch.commit();
        alert("Import successful! The app will reload.");
        window.location.reload();
      } catch (err) {
        console.error("Import error", err);
        alert("Invalid backup file.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      // Create a temporary hidden div for the report
      const reportDiv = document.createElement('div');
      reportDiv.style.position = 'absolute';
      reportDiv.style.left = '-9999px';
      reportDiv.style.width = '800px';
      reportDiv.style.padding = '40px';
      reportDiv.style.backgroundColor = '#ffffff';
      reportDiv.style.color = '#333333';
      reportDiv.style.fontFamily = 'Arial, sans-serif';

      reportDiv.innerHTML = `
        <div style="text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin: 0;">Journey Progress Report</h1>
          <p style="color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
            <h3 style="margin-top: 0; color: #007bff;">Character Stats</h3>
            <p><strong>Level:</strong> ${userData?.level || 1}</p>
            <p><strong>Total XP:</strong> ${userData?.xp || 0}</p>
            <p><strong>Current Streak:</strong> ${userData?.streak || 0} Days</p>
            <p><strong>Highest Streak:</strong> ${userData?.highestStreak || 0} Days</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
            <h3 style="margin-top: 0; color: #007bff;">Attributes</h3>
            <p><strong>Intelligence (INT):</strong> ${userData?.int || 0}</p>
            <p><strong>Strength (STR):</strong> ${userData?.str || 0}</p>
            <p><strong>Spirit (SPR):</strong> ${userData?.spr || 0}</p>
            <p><strong>Charisma (CHA):</strong> ${userData?.cha || 0}</p>
          </div>
        </div>

        <div style="margin-bottom: 40px;">
          <h3 style="color: #007bff;">Lifetime Achievements</h3>
          <p><strong>Total Days Connected:</strong> ${userData?.totalDaysConnected || 0}</p>
          <p><strong>Total Productive Minutes:</strong> ${userData?.totalMinutes || 0}</p>
        </div>

        <div style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; pt-20px; color: #999;">
          <p>Keep pushing forward. Every small action builds your character.</p>
        </div>
      `;

      document.body.appendChild(reportDiv);
      const canvas = await html2canvas(reportDiv, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`mhrtask_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.removeChild(reportDiv);
    } catch (e) {
      console.error("Report error", e);
      alert("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  const handleFactoryReset = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);

      const userRef = doc(db, "users", currentUser.uid);
      const initialStats = {
        xp: 0, level: 1, str: 0, int: 0, spr: 0, cha: 0,
        streak: 0, highestStreak: 0, totalDaysConnected: 0, totalMinutes: 0,
        lastActiveDate: new Date().toDateString(), lastResetDate: new Date().toDateString(),
        actionsToday: 0,
        morningTime: 0, afternoonTime: 0, nightTime: 0,
        dayLocked: false, isProtected: false
      };
      batch.set(userRef, initialStats);
      
      const collections = ["routines", "todos", "journal", "notifications"];
      for (const colName of collections) {
        const snap = await getDocs(collection(db, "users", currentUser.uid, colName));
        snap.docs.forEach((d) => batch.delete(d.ref));
      }

      await batch.commit();
      setLoading(false);
      setShowResetModal(false);
      window.location.reload();
    } catch (e) { console.error(e); setLoading(false); }
  };

  return (
    <div className="container py-4 mb-5">
      <h2 className="fw-bold mb-4">Settings</h2>

      {/* Data Section */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <h5 className="fw-bold mb-3"><i className="bi bi-cloud-arrow-up me-2 text-primary"></i>Data & Backup</h5>
        <div className="d-grid gap-3">
          <button 
            disabled={loading} 
            className="btn btn-outline-primary rounded-pill fw-bold" 
            onClick={handleExport}
          >
            <i className="bi bi-download me-2"></i>Backup Data (JSON)
          </button>
          
          <button 
            disabled={loading} 
            className="btn btn-outline-primary rounded-pill fw-bold" 
            onClick={() => fileInputRef.current.click()}
          >
            <i className="bi bi-upload me-2"></i>Restore Data (JSON)
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: "none" }} 
            accept=".json" 
            onChange={handleImport} 
          />
        </div>
      </div>

      {/* Reports Section */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <h5 className="fw-bold mb-3"><i className="bi bi-file-earmark-pdf me-2 text-danger"></i>Insights & Reports</h5>
        <div className="d-grid">
          <button 
            disabled={loading} 
            className="btn btn-outline-danger rounded-pill fw-bold" 
            onClick={handleGenerateReport}
          >
            <i className="bi bi-file-pdf me-2"></i>Download Progress Report (PDF)
          </button>
        </div>
      </div>

      {/* Support Section */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4">
        <h5 className="fw-bold mb-3"><i className="bi bi-question-circle me-2 text-info"></i>Support</h5>
        <div className="d-grid">
          <Link to="/help" className="btn btn-outline-info rounded-pill fw-bold">
            <i className="bi bi-info-circle me-2"></i>Guide & FAQ
          </Link>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 border-start border-danger border-4">
        <h5 className="fw-bold mb-3 text-danger"><i className="bi bi-exclamation-triangle me-2"></i>Danger Zone</h5>
        <p className="small text-muted mb-4">Factory reset will delete all your progress, routines, and journal entries forever.</p>
        <button className="btn btn-danger rounded-pill fw-bold" onClick={() => setShowResetModal(true)}>
          <i className="bi bi-trash3 me-2"></i>Factory Reset
        </button>
      </div>
      
      <ConfirmationModal 
        show={showResetModal}
        title="Factory Reset"
        message="Type 'RESET' below to confirm deletion of all data."
        onCancel={() => setShowResetModal(false)}
        onConfirm={handleFactoryReset}
        disabled={resetConfirmText !== "RESET"}
      >
        <input type="text" className="form-control mt-2 rounded-3" placeholder="Type RESET" onChange={(e) => setResetConfirmText(e.target.value)} />
      </ConfirmationModal>
    </div>
  );
};

export default Settings;
