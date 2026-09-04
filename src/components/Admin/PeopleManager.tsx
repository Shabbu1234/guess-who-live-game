import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Upload, Trash2, Edit, Check, AlertCircle, FileSpreadsheet, RefreshCw, UserPlus } from 'lucide-react';

interface Person {
  id: string;
  name: string;
  childhood_photo_url: string;
  adult_photo_url: string;
  active: number;
  is_used?: boolean;
}

export const PeopleManager: React.FC<{ activeGameId?: string }> = ({ activeGameId }) => {
  const [people, setPeople] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);

  // Form states
  const [personName, setPersonName] = useState('');
  const [childhoodFile, setChildhoodFile] = useState<File | null>(null);
  const [adultFile, setAdultFile] = useState<File | null>(null);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchPeople = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = activeGameId
        ? `/api/admin/people?game_id=${activeGameId}&search=${encodeURIComponent(search)}`
        : `/api/admin/people?search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setPeople(data.people || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeGameId, search]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName) return;

    const formData = new FormData();
    formData.append('name', personName);
    if (childhoodFile) formData.append('childhood_photo', childhoodFile);
    if (adultFile) formData.append('adult_photo', adultFile);

    try {
      const url = editingPersonId ? `/api/admin/people/${editingPersonId}` : '/api/admin/people';
      const method = editingPersonId ? 'PUT' : 'POST';

      const res = await fetch(url, { method, body: formData });
      if (res.ok) {
        setMsg(`Successfully ${editingPersonId ? 'updated' : 'added'} member!`);
        setShowAddModal(false);
        resetForm();
        fetchPeople();
      }
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const handleDeletePerson = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      const res = await fetch(`/api/admin/people/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPeople();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;
    const formData = new FormData();
    formData.append('csv_file', csvFile);

    try {
      const res = await fetch('/api/admin/people/import-csv', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Imported ${data.importedCount} members from CSV!`);
        setShowCsvModal(false);
        setCsvFile(null);
        fetchPeople();
      }
    } catch (err: any) {
      setMsg(`CSV Import Error: ${err.message}`);
    }
  };

  const handleSeedDemo = async () => {
    try {
      const res = await fetch('/api/admin/people/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Seeded sample dataset! Total people: ${data.totalPeople.c}`);
        fetchPeople();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setPersonName('');
    setChildhoodFile(null);
    setAdultFile(null);
    setEditingPersonId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white">PEOPLE & PHOTO DATABASE</h2>
          <p className="text-xs text-slate-400">Total Members: {people.length}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-purple-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>

          <button
            onClick={() => setShowCsvModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1.5 border border-slate-700 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleSeedDemo}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center space-x-1.5 border border-slate-700 transition-all"
            title="Populate 25 demo members with 1 click"
          >
            <UserPlus className="w-4 h-4 text-pink-400" />
            <span>Seed 25 Demo Members</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-purple-950/80 border border-purple-800 text-purple-200 text-xs font-semibold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-purple-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search member by name..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-purple-500 transition-all"
        />
      </div>

      {/* Grid of Members */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {people.map((person) => (
          <div key={person.id} className="glass-card p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-sm truncate">{person.name}</h3>
              {person.is_used ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-bold">USED</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold">AVAILABLE</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 text-center">
                <img src={person.childhood_photo_url} alt="Child" className="w-full aspect-square object-cover rounded-lg bg-slate-950 border border-slate-800" />
                <span className="text-[9px] font-bold text-slate-400">CHILDHOOD</span>
              </div>
              <div className="space-y-1 text-center">
                <img src={person.adult_photo_url} alt="Adult" className="w-full aspect-square object-cover rounded-lg bg-slate-950 border border-slate-800" />
                <span className="text-[9px] font-bold text-purple-400">CURRENT</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-1 pt-1 border-t border-slate-800/60">
              <button
                onClick={() => {
                  setEditingPersonId(person.id);
                  setPersonName(person.name);
                  setShowAddModal(true);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Edit"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeletePerson(person.id, person.name)}
                className="p-1.5 rounded-lg hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">
              {editingPersonId ? 'Edit Member' : 'Add New Member'}
            </h3>
            <form onSubmit={handleSavePerson} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Childhood Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setChildhoodFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-purple-300 hover:file:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Adult / Current Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAdultFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-purple-300 hover:file:bg-slate-700"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-500 glow-btn"
                >
                  Save Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white">Import Members CSV</h3>
            <p className="text-xs text-slate-400">
              CSV file must have headers: <code className="text-purple-300 font-mono">name, childhood_photo, adult_photo</code>
            </p>
            <form onSubmit={handleCsvImport} className="space-y-4">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                required
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!csvFile}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 disabled:opacity-50"
                >
                  Upload & Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
