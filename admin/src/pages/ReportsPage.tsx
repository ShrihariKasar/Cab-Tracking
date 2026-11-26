import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { adminApi } from '../services/api';

const REPORT_TYPES = [
  { key: 'daily', label: 'Daily Trip Report' },
  { key: 'monthly', label: 'Monthly Trip Report' },
  { key: 'driver-performance', label: 'Driver Performance Report' },
  { key: 'vehicle-utilization', label: 'Vehicle Utilization Report' },
  { key: 'distance', label: 'Total Distance Report' },
  { key: 'cancellations', label: 'Booking Cancellation Report' },
];

export const ReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState('daily');
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await adminApi.get(`/admin/reports/${reportType}?format=json`);
      setRows(res.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportType}-report.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h1>Operational Reports</h1>
      <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
          {REPORT_TYPES.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={fetchReport} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>
          Export CSV
        </button>
        <button className="btn btn-secondary" onClick={exportExcel} disabled={rows.length === 0}>
          Export Excel (.xlsx)
        </button>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div>Select a report type and click Generate Report.</div>
        ) : (
          <table>
            <thead>
              <tr>
                {Object.keys(rows[0]).map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {Object.keys(rows[0]).map((col) => (
                    <td key={col}>{String(row[col] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
