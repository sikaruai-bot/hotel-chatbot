'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Save,
  Trash2,
  Settings,
  Link2,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
} from 'lucide-react';

export default function KnowledgePage() {
  const [kbItems, setKbItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchKnowledge = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/knowledge');
      const data = await res.json();
      if (data.kb) setKbItems(data.kb);
      if (data.settings) setSettings(data.settings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleSaveKb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const res = await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_kb', item: editingItem }),
      });
      if (res.ok) {
        setStatusMsg('Knowledge item saved successfully!');
        setEditingItem(null);
        setIsNew(false);
        fetchKnowledge();
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteKb = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge item?')) return;
    try {
      await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_kb', item: { id } }),
      });
      fetchKnowledge();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/admin/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_setting',
          setting: { key, value },
        }),
      });
      setStatusMsg('Setting updated!');
      fetchKnowledge();
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [
    'ALL',
    'HOTEL_INFO',
    'FACILITIES',
    'SHARED_KITCHEN',
    'PRICING',
    'POLICIES',
    'LOCATION',
    'TRANSPORT',
    'CHECKIN_OUT',
    'FAQ',
  ];

  const filteredKb = kbItems.filter(
    (item) => activeCategory === 'ALL' || item.category === activeCategory
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hotel Knowledge Base & Settings
          </h1>
          <p className="text-xs text-slate-500">
            Edit hotel facts, anti-hallucination rules, policies, and booking links. All changes apply immediately to the AI engine.
          </p>
        </div>

        <button
          onClick={() => {
            setIsNew(true);
            setEditingItem({
              category: 'FAQ',
              topic: '',
              question: '',
              answer: '',
              keywords: '',
            });
          }}
          className="inline-flex items-center gap-1 text-xs bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg transition shadow-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          <span>Add Knowledge Item</span>
        </button>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-xs px-4 py-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Edit / Create Modal Form */}
      {editingItem && (
        <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-md">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            {isNew ? 'Create New Knowledge Base Item' : 'Edit Knowledge Item'}
          </h2>

          <form onSubmit={handleSaveKb} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={editingItem.category}
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
                >
                  {categories.filter((c) => c !== 'ALL').map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Topic Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Quiet Hours Policy"
                  value={editingItem.topic}
                  onChange={(e) => setEditingItem({ ...editingItem, topic: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Typical Guest Question
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Do you have a restaurant or breakfast?"
                value={editingItem.question}
                onChange={(e) => setEditingItem({ ...editingItem, question: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Grounded Bot Answer (Source of Truth)
              </label>
              <textarea
                rows={3}
                required
                placeholder="Exact factual response the chatbot must provide..."
                value={editingItem.answer}
                onChange={(e) => setEditingItem({ ...editingItem, answer: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keywords (Comma-separated for matching)
              </label>
              <input
                type="text"
                placeholder="e.g., food, restaurant, cafe, breakfast, dining"
                value={editingItem.keywords || ''}
                onChange={(e) => setEditingItem({ ...editingItem, keywords: e.target.value })}
                className="w-full text-xs border border-slate-300 rounded-lg p-2"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-xs text-slate-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Knowledge Item</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Knowledge Base Item Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredKb.map((item) => (
          <div
            key={item.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {item.category}
                </span>
                <span className="text-xs text-slate-400 font-medium">{item.topic}</span>
              </div>

              <h3 className="font-semibold text-xs text-slate-900 mt-2">
                Q: {item.question}
              </h3>

              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {item.answer}
              </p>

              {item.keywords && (
                <div className="text-[10px] text-slate-400 mt-2">
                  <strong>Keywords:</strong> {item.keywords}
                </div>
              )}
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => {
                  setIsNew(false);
                  setEditingItem(item);
                }}
                className="text-slate-700 hover:text-slate-900 font-medium px-2 py-1 rounded hover:bg-slate-100 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteKb(item.id)}
                className="text-rose-600 hover:text-rose-800 font-medium px-2 py-1 rounded hover:bg-rose-50 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* External Booking Links & Settings Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-500" />
          <span>Configurable Booking & Channel Links</span>
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          The chatbot shares these configured links rather than hard-coded URLs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {settings
            .filter((s) => s.category === 'LINKS' || s.category === 'CONTACT')
            .map((s) => (
              <div key={s.id} className="text-xs">
                <label className="block font-semibold text-slate-700 mb-1">
                  {s.description || s.key}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={s.value}
                    onBlur={(e) => {
                      if (e.target.value !== s.value) {
                        handleUpdateSetting(s.key, e.target.value);
                      }
                    }}
                    className="flex-1 text-xs border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
