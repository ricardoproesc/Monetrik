/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Person } from "../types";
import { Plus, Trash2, Mail, Phone, Calendar, User, Check, AlertCircle, Pencil, X } from "lucide-react";

interface PeopleManagerProps {
  people: Person[];
  onAddPerson: (person: Omit<Person, 'id'>) => void;
  onToggleActive: (id: string) => void;
  onDeletePerson: (id: string) => void;
  onUpdatePerson: (person: Person) => void;
}

// Preset modern colors for identifiers
const COLOR_PRESETS = [
  { name: 'Esmeralda', value: '#10b981', bgClass: 'bg-emerald-500' },
  { name: 'Azul Cósmico', value: '#3b82f6', bgClass: 'bg-blue-500' },
  { name: 'Índigo Violeta', value: '#6366f1', bgClass: 'bg-indigo-500' },
  { name: 'Âmbar Solar', value: '#f59e0b', bgClass: 'bg-amber-500' },
  { name: 'Coral Suave', value: '#f43f5e', bgClass: 'bg-rose-500' },
  { name: 'Ciano Aquático', value: '#06b6d4', bgClass: 'bg-cyan-500' },
];

const RELATIONSHIP_LABELS: Record<string, string> = {
  principal: "Titular",
  conjuge: "Cônjuge",
  "filho(a)": "Filho(a)",
  "pai/mae": "Pai/Mãe",
  outro: "Outro"
};

export default function PeopleManager({ people, onAddPerson, onToggleActive, onDeletePerson, onUpdatePerson }: PeopleManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [gender, setGender] = useState<'masculino' | 'feminino' | 'outro'>("masculino");
  const [relationship, setRelationship] = useState<'principal' | 'conjuge' | 'filho(a)' | 'pai/mae' | 'outro'>("filho(a)");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PRESETS[0].value);
  const [avatar, setAvatar] = useState("👨");

  const [validationError, setValidationError] = useState("");

  // Editing individual person states
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState<'masculino' | 'feminino' | 'outro'>("masculino");
  const [editRelationship, setEditRelationship] = useState<'principal' | 'conjuge' | 'filho(a)' | 'pai/mae' | 'outro'>("filho(a)");
  const [editEmail, setEditEmail] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editColor, setEditColor] = useState(COLOR_PRESETS[0].value);
  const [editAvatar, setEditAvatar] = useState("👨");
  const [editActive, setEditActive] = useState(true);
  const [editValidationError, setEditValidationError] = useState("");

  const [personToDeleteId, setPersonToDeleteId] = useState<string | null>(null);

  const handleOpenEdit = (person: Person) => {
    setEditingPerson(person);
    setEditName(person.name);
    setEditGender(person.gender);
    setEditRelationship(person.relationship);
    setEditEmail(person.email);
    setEditWhatsapp(person.whatsapp);
    setEditBirthDate(person.birthDate || "");
    setEditColor(person.color);
    setEditAvatar(person.avatar || "👤");
    setEditActive(person.active);
    setEditValidationError("");
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerson) return;

    if (!editName.trim()) {
      setEditValidationError("O nome do integrante é obrigatório.");
      return;
    }
    if (!editEmail.trim() || !editEmail.includes("@")) {
      setEditValidationError("Por favor, insira um e-mail válido.");
      return;
    }
    if (!editWhatsapp.trim()) {
      setEditValidationError("Por favor, insira um número de WhatsApp.");
      return;
    }

    onUpdatePerson({
      id: editingPerson.id,
      name: editName,
      gender: editGender,
      relationship: editRelationship,
      email: editEmail,
      whatsapp: editWhatsapp,
      birthDate: editBirthDate || undefined,
      color: editColor,
      avatar: editAvatar,
      active: editActive
    });

    setEditingPerson(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError("O nome do integrante é obrigatório.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setValidationError("Por favor, insira um e-mail válido.");
      return;
    }
    if (!whatsapp.trim()) {
      setValidationError("Por favor, insira um número de WhatsApp.");
      return;
    }

    onAddPerson({
      name,
      gender,
      relationship,
      email,
      whatsapp,
      birthDate: birthDate || undefined,
      color: selectedColor,
      avatar,
      active: true
    });

    // Reset Form
    setName("");
    setGender("filho(a)" as any);
    setRelationship("filho(a)");
    setEmail("");
    setWhatsapp("");
    setBirthDate("");
    setAvatar("👤");
    setValidationError("");
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 animate-fade-in p-1">
      
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-950">Gestão do Núcleo Familiar</h2>
          <p className="text-sm text-zinc-500 mt-0.5">Administre os membros da família responsáveis pelas receitas ou vinculados às despesas.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          id="btn-add-person"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition-colors rounded-lg shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Adicionar Integrante
        </button>
      </div>

      {/* Expandable Add Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="border border-zinc-200 rounded-xl bg-zinc-50/50 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-950">Novo Integrante da Família</h3>
          
          {validationError && (
            <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Amanda Gomes"
                className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
              />
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Parentesco</label>
              <select
                value={relationship}
                onChange={e => setRelationship(e.target.value as any)}
                className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
              >
                <option value="principal">Titular Financeiro</option>
                <option value="conjuge">Cônjuge / Parceiro(a)</option>
                <option value="filho(a)">Filho(a)</option>
                <option value="pai/mae">Pai / Mãe</option>
                <option value="outro">Outro Familiar</option>
              </select>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Sexo</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setGender('masculino'); setAvatar('👨'); }}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${gender === 'masculino' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
                >
                  Masc
                </button>
                <button
                  type="button"
                  onClick={() => { setGender('feminino'); setAvatar('👩'); }}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${gender === 'feminino' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
                >
                  Fem
                </button>
                <button
                  type="button"
                  onClick={() => { setGender('outro'); setAvatar('👤'); }}
                  className={`py-2 text-xs font-medium rounded-lg border transition-all ${gender === 'outro' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
                >
                  Outro
                </button>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Ex: amanda@email.com"
                className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
              />
            </div>

            {/* Whatsapp */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                placeholder="Ex: 11999990000"
                className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
              />
            </div>

            {/* Birthdate */}
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">Nascimento (Opcional)</label>
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400"
              />
            </div>

          </div>

          {/* Color & Avatar presets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-2">Cor de Identificação (Dashboard)</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedColor(preset.value)}
                    className="h-8 px-3 rounded-lg flex items-center gap-1.5 border text-xs text-zinc-700 transition-all font-medium border-zinc-200 hover:border-zinc-300"
                  >
                    <span className={`h-3 w-3 rounded-full ${preset.bgClass}`}></span>
                    {preset.name}
                    {selectedColor === preset.value && (
                      <Check className="h-3 w-3 text-zinc-900" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-2">Avatar do Integrante</label>
              <div className="flex gap-2">
                {['👨', '👩', '👤', '👧', '👦', '👵', '👴', '💼'].map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`h-9 w-9 text-lg flex items-center justify-center rounded-lg border transition-all ${avatar === av ? 'border-zinc-950 bg-zinc-100 scale-105' : 'border-zinc-200 bg-white hover:border-zinc-300'}`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium border border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
            >
              Salvar Membro
            </button>
          </div>
        </form>
      )}

      {/* Grid of existing family members */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {people.map(person => {
          console.log("[PERSON]", person.id, "{ name:", person.name, ", relationship:", person.relationship, ", active:", person.active, ", showDelete:", person.relationship !== 'principal' || !person.name, "}");
          return (
          <div
            key={person.id}
            id={`person-card-${person.id}`}
            className={`border rounded-xl bg-white p-5 space-y-4 hover:shadow-xs transition-shadow relative overflow-hidden ${!person.active ? 'border-zinc-100 opacity-60' : 'border-zinc-200'}`}
          >
            {/* Color accent corner bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5"
              style={{ backgroundColor: person.color }}
            ></div>

            {/* Grid line row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl" id={`avatar-${person.id}`}>{person.avatar || '👤'}</span>
                <div>
                  <h4 className="font-semibold text-sm text-zinc-950 flex items-center gap-1.5 leading-none">
                    {person.name}
                    {!person.active && (
                      <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">Inativo</span>
                    )}
                  </h4>
                  <span className="text-[11px] font-medium text-zinc-400 block mt-1">
                    {RELATIONSHIP_LABELS[person.relationship] || person.relationship}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(person)}
                  className="p-1 px-1.5 text-zinc-400 hover:text-zinc-800 rounded hover:bg-zinc-100 transition-colors"
                  title="Editar Integrante"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {/* Delete option - prevent deleting index-0 main owner directly without warning */}
                {(person.relationship !== 'principal' || !person.name) && (
                  <button
                    onClick={() => setPersonToDeleteId(person.id)}
                    className="p-1 px-1.5 text-zinc-400 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                    title="Excluir Integrante"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onToggleActive(person.id)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded transition-colors ${person.active ? 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                >
                  {person.active ? "Ativo" : "Ativar"}
                </button>
              </div>
            </div>

            {/* Specific contact information */}
            <div className="space-y-1.5 text-xs text-zinc-600 pt-1">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="truncate">{person.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span>{person.whatsapp}</span>
              </div>
              {person.birthDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  <span>Nascimento: {new Date(person.birthDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}
            </div>
          </div>
        );
        })}
      </div>

      {/* MODAL DE EDIÇÃO DE INTEGRANTE */}
      {editingPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-3xl border border-zinc-200 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-zinc-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4.5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white">Editar Integrante</h3>
                  <p className="text-[10px] text-zinc-400">Atualize os dados cadastrais de {editingPerson.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPerson(null)}
                className="p-1 px-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleUpdateSubmit} className="flex flex-col flex-grow overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-grow">
                {editValidationError && (
                  <div className="flex items-center gap-2 text-xs bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-100">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{editValidationError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Nome Completo</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Ex: Amanda Gomes"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-sans"
                    />
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Parentesco</label>
                    <select
                      value={editRelationship}
                      onChange={e => setEditRelationship(e.target.value as any)}
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-sans"
                    >
                      <option value="principal">Titular Financeiro</option>
                      <option value="conjuge">Cônjuge / Parceiro(a)</option>
                      <option value="filho(a)">Filho(a)</option>
                      <option value="pai/mae">Pai / Mãe</option>
                      <option value="outro font-sans">Outro Familiar</option>
                    </select>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Sexo</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => { setEditGender('masculino'); setEditAvatar('👨'); }}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${editGender === 'masculino' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
                      >
                        Masc
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditGender('feminino'); setEditAvatar('👩'); }}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${editGender === 'feminino' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
                      >
                        Fem
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditGender('outro'); setEditAvatar('👤'); }}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${editGender === 'outro' ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
                      >
                        Outro
                      </button>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Status de Lançamentos</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditActive(true)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${editActive ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
                      >
                        Ativo
                      </button>
                      <button
                        type="button"
                        disabled={editRelationship === 'principal'}
                        onClick={() => setEditActive(false)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-all ${!editActive ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-200 bg-white text-zinc-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={editRelationship === 'principal' ? 'Titular financeiro não pode ser desativado.' : ''}
                      >
                        Inativo
                      </button>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">E-mail</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="Ex: amanda@email.com"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-sans"
                    />
                  </div>

                  {/* Whatsapp */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">WhatsApp</label>
                    <input
                      type="text"
                      value={editWhatsapp}
                      onChange={e => setEditWhatsapp(e.target.value)}
                      placeholder="Ex: 11999990000"
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-sans"
                    />
                  </div>

                  {/* Birthdate */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">Data de Nascimento (Opcional)</label>
                    <input
                      type="date"
                      value={editBirthDate}
                      onChange={e => setEditBirthDate(e.target.value)}
                      className="w-full text-xs border border-zinc-200 bg-white rounded-lg p-2.5 focus:outline-none focus:border-zinc-400 font-sans"
                    />
                  </div>
                </div>

                {/* Color and Avatar presets */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Cor de Identificação (Dashboard)</label>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setEditColor(preset.value)}
                          className="h-8 px-3 rounded-lg flex items-center gap-1.5 border text-xs text-zinc-700 transition-all font-medium border-zinc-200 hover:border-zinc-300 cursor-pointer"
                        >
                          <span className={`h-3 w-3 rounded-full ${preset.bgClass}`}></span>
                          {preset.name}
                          {editColor === preset.value && (
                            <Check className="h-3 w-3 text-zinc-900 font-sans" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-2">Avatar do Integrante</label>
                    <div className="flex gap-2 flex-wrap">
                      {['👨', '👩', '👤', '👧', '👦', '👵', '👴', '💼'].map(av => (
                        <button
                          key={av}
                          type="button"
                          onClick={() => setEditAvatar(av)}
                          className={`h-9 w-9 text-lg flex items-center justify-center rounded-lg border transition-all ${editAvatar === av ? 'border-zinc-950 bg-zinc-100 scale-105 font-sans' : 'border-zinc-200 bg-white hover:border-zinc-300 font-sans'}`}
                        >
                          {av}
                        </button>
                       ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 text-right flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingPerson(null)}
                  className="px-4 py-2 text-xs font-semibold border border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-zinc-950 text-white hover:bg-zinc-800 rounded-lg transition-colors shadow-sm cursor-pointer font-sans"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO DE INTEGRANTE */}
      {personToDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in font-sans">
          <div className="bg-white rounded-2xl border border-zinc-200 w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-900">Excluir Integrante Familiar?</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Tem certeza de que deseja remover <strong>{people.find(p => p.id === personToDeleteId)?.name}</strong> da sua conta familiar? Esta exclusão removerá o integrante e não poderá ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setPersonToDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold border border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (personToDeleteId) {
                    onDeletePerson(personToDeleteId);
                    setPersonToDeleteId(null);
                  }
                }}
                className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
