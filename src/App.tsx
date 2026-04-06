/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Users, 
  Calendar, 
  MapPin, 
  Plus, 
  ChevronRight, 
  Settings, 
  LayoutDashboard,
  Trash2,
  Save,
  X,
  Play,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { Tournament, Team, Match, TeamStats, Player, Card } from './types';

const scheduleMatches = (matches: Match[]) => {
  if (matches.length === 0) return [];
  
  // Group matches by group name
  const matchesByGroup: Record<string, Match[]> = {};
  matches.forEach(m => {
    const g = m.group || 'Geral';
    if (!matchesByGroup[g]) matchesByGroup[g] = [];
    matchesByGroup[g].push(m);
  });

  const groupNames = Object.keys(matchesByGroup).sort();
  const scheduled: Match[] = [];
  const totalMatches = matches.length;
  
  // Track teams that played recently to ensure rest
  // We'll try to avoid teams that played in the last 2 matches (4 teams total)
  let recentTeams: string[] = [];

  while (scheduled.length < totalMatches) {
    let matchAddedInThisCycle = false;

    for (const gName of groupNames) {
      const pool = matchesByGroup[gName];
      if (pool.length === 0) continue;

      // Try to find a match in this group where teams haven't played recently
      let matchIndex = pool.findIndex(m => 
        !recentTeams.includes(m.homeTeamId) && !recentTeams.includes(m.awayTeamId)
      );

      // If not found, try to find a match where at least they didn't play in the VERY last match
      if (matchIndex === -1) {
        const lastMatchTeams = recentTeams.slice(-2);
        matchIndex = pool.findIndex(m => 
          !lastMatchTeams.includes(m.homeTeamId) && !lastMatchTeams.includes(m.awayTeamId)
        );
      }

      // If still not found, just pick the first one (fallback)
      if (matchIndex === -1) {
        matchIndex = 0;
      }

      const nextMatch = pool.splice(matchIndex, 1)[0];
      scheduled.push(nextMatch);
      matchAddedInThisCycle = true;

      // Update recent teams (keep track of last 2 matches / 4 teams)
      recentTeams.push(nextMatch.homeTeamId, nextMatch.awayTeamId);
      if (recentTeams.length > 4) {
        recentTeams = recentTeams.slice(-4);
      }
    }

    // Safety break if we get stuck (shouldn't happen)
    if (!matchAddedInThisCycle && scheduled.length < totalMatches) {
      groupNames.forEach(g => {
        if (matchesByGroup[g].length > 0) {
          scheduled.push(...matchesByGroup[g].splice(0));
        }
      });
    }
  }

  return scheduled;
};

const generateRoundRobin = (teams: Team[], groupName?: string, startDate?: string) => {
  const matches: Match[] = [];
  const n = teams.length;
  if (n < 2) return [];

  const teamIds = teams.map(t => t.id);
  if (n % 2 !== 0) teamIds.push('BYE'); // Add a dummy team for odd number of teams

  const rounds = teamIds.length - 1;
  const half = teamIds.length / 2;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = teamIds[i];
      const away = teamIds[teamIds.length - 1 - i];

      if (home !== 'BYE' && away !== 'BYE') {
        matches.push({
          id: crypto.randomUUID(),
          homeTeamId: home,
          awayTeamId: away,
          date: startDate || new Date().toISOString(),
          status: 'scheduled',
          round: round + 1,
          group: groupName
        });
      }
    }
    // Rotate teamIds (keep first team fixed)
    teamIds.splice(1, 0, teamIds.pop()!);
  }
  return matches;
};

// --- Mock Initial Data ---
const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: '1',
    name: 'Torneio de Verão - Grupo A',
    date: '2024-06-15',
    location: 'Arena Central',
    status: 'ongoing',
    format: 'league',
    teams: [
      { id: 't1', name: 'Brasil', players: [{ id: 'p1', name: 'Neymar Jr', number: 10 }, { id: 'p2', name: 'Vinícius Jr', number: 7 }] },
      { id: 't2', name: 'Argentina', players: [{ id: 'p3', name: 'Lionel Messi', number: 10 }, { id: 'p4', name: 'Julián Álvarez', number: 9 }] },
      { id: 't3', name: 'França', players: [{ id: 'p5', name: 'Kylian Mbappé', number: 10 }, { id: 'p6', name: 'Antoine Griezmann', number: 7 }] },
      { id: 't4', name: 'Alemanha', players: [{ id: 'p7', name: 'Jamal Musiala', number: 10 }, { id: 'p8', name: 'Thomas Müller', number: 25 }] },
    ],
    matches: [
      { id: 'm1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 2, awayScore: 1, date: '2024-06-15T14:00:00', status: 'finished', round: 1 },
      { id: 'm2', homeTeamId: 't3', awayTeamId: 't4', homeScore: 3, awayScore: 0, date: '2024-06-15T15:30:00', status: 'finished', round: 1 },
      { id: 'm3', homeTeamId: 't1', awayTeamId: 't3', homeScore: 1, awayScore: 1, date: '2024-06-22T14:00:00', status: 'finished', round: 2 },
      { id: 'm4', homeTeamId: 't2', awayTeamId: 't4', date: '2024-06-22T15:30:00', status: 'scheduled', round: 2 },
      { id: 'm5', homeTeamId: 't1', awayTeamId: 't4', date: '2024-06-29T14:00:00', status: 'scheduled', round: 3 },
      { id: 'm6', homeTeamId: 't2', awayTeamId: 't3', date: '2024-06-29T15:30:00', status: 'scheduled', round: 3 },
    ]
  }
];

export default function App() {
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('futsal_tournaments');
    return saved ? JSON.parse(saved) : INITIAL_TOURNAMENTS;
  });

  const loadDemoTournament = () => {
    const demoTeams: Team[] = [
      { id: 't1', name: 'Brasil', players: [], groupId: 'Grupo A' },
      { id: 't2', name: 'França', players: [], groupId: 'Grupo A' },
      { id: 't3', name: 'Japão', players: [], groupId: 'Grupo A' },
      { id: 't4', name: 'Egito', players: [], groupId: 'Grupo A' },
      { id: 't5', name: 'Argentina', players: [], groupId: 'Grupo B' },
      { id: 't6', name: 'Alemanha', players: [], groupId: 'Grupo B' },
      { id: 't7', name: 'Marrocos', players: [], groupId: 'Grupo B' },
      { id: 't8', name: 'Austrália', players: [], groupId: 'Grupo B' },
    ];

    const groupMatches: Match[] = [
      // Grupo A
      { id: 'm1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 3, awayScore: 1, date: '2024-06-15T14:00', status: 'finished', round: 1, group: 'Grupo A' },
      { id: 'm2', homeTeamId: 't3', awayTeamId: 't4', homeScore: 0, awayScore: 0, date: '2024-06-15T16:00', status: 'finished', round: 1, group: 'Grupo A' },
      { id: 'm3', homeTeamId: 't1', awayTeamId: 't3', homeScore: 2, awayScore: 0, date: '2024-06-16T14:00', status: 'finished', round: 2, group: 'Grupo A' },
      { id: 'm4', homeTeamId: 't2', awayTeamId: 't4', homeScore: 2, awayScore: 1, date: '2024-06-16T16:00', status: 'finished', round: 2, group: 'Grupo A' },
      { id: 'm5', homeTeamId: 't1', awayTeamId: 't4', homeScore: 4, awayScore: 0, date: '2024-06-17T14:00', status: 'finished', round: 3, group: 'Grupo A' },
      { id: 'm6', homeTeamId: 't2', awayTeamId: 't3', homeScore: 1, awayScore: 0, date: '2024-06-17T16:00', status: 'finished', round: 3, group: 'Grupo A' },
      // Grupo B
      { id: 'm7', homeTeamId: 't5', awayTeamId: 't6', homeScore: 2, awayScore: 2, date: '2024-06-15T14:00', status: 'finished', round: 1, group: 'Grupo B' },
      { id: 'm8', homeTeamId: 't7', awayTeamId: 't8', homeScore: 1, awayScore: 0, date: '2024-06-15T16:00', status: 'finished', round: 1, group: 'Grupo B' },
      { id: 'm9', homeTeamId: 't5', awayTeamId: 't7', homeScore: 3, awayScore: 1, date: '2024-06-16T14:00', status: 'finished', round: 2, group: 'Grupo B' },
      { id: 'm10', homeTeamId: 't6', awayTeamId: 't8', homeScore: 2, awayScore: 0, date: '2024-06-16T16:00', status: 'finished', round: 2, group: 'Grupo B' },
      { id: 'm11', homeTeamId: 't5', awayTeamId: 't8', homeScore: 4, awayScore: 1, date: '2024-06-17T14:00', status: 'finished', round: 3, group: 'Grupo B' },
      { id: 'm12', homeTeamId: 't7', awayTeamId: 't6', homeScore: 1, awayScore: 1, date: '2024-06-17T16:00', status: 'finished', round: 3, group: 'Grupo B' },
      // Knockout
      { id: 'm13', homeTeamId: 't1', awayTeamId: 't6', homeScore: 2, awayScore: 1, date: '2024-06-19T14:00', status: 'finished', round: 4, group: 'Semifinal' },
      { id: 'm14', homeTeamId: 't5', awayTeamId: 't2', homeScore: 3, awayScore: 2, date: '2024-06-19T16:00', status: 'finished', round: 4, group: 'Semifinal' },
      { id: 'm15', homeTeamId: 't1', awayTeamId: 't5', homeScore: 1, awayScore: 0, date: '2024-06-21T18:00', status: 'finished', round: 5, group: 'Final' },
    ];

    const demoTournament: Tournament = {
      id: 'demo-cup',
      name: 'Copa do Mundo Profissional',
      date: '2024-06-15',
      location: 'Estádio Nacional',
      status: 'completed',
      teams: demoTeams,
      matches: groupMatches,
      format: 'group_knockout'
    };

    setTournaments([demoTournament, ...tournaments]);
    setSelectedTournamentId('demo-cup');
    setActiveTab('active-tournament');
  };
  
  const [activeTab, setActiveTab] = useState<'tournaments' | 'active-tournament'>('tournaments');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    localStorage.setItem('futsal_tournaments', JSON.stringify(tournaments));
  }, [tournaments]);

  const activeTournament = useMemo(() => 
    tournaments.find(t => t.id === selectedTournamentId), 
    [tournaments, selectedTournamentId]
  );

  const handleCreateTournament = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newId = crypto.randomUUID();
    const newTournament: Tournament = {
      id: newId,
      name: formData.get('name') as string,
      date: formData.get('date') as string,
      location: formData.get('location') as string,
      status: 'draft',
      format: formData.get('format') as any,
      teams: [],
      matches: [],
      cards: [],
      config: {
        perGroup: parseInt(formData.get('perGroup') as string) || 4,
        qualify: parseInt(formData.get('qualify') as string) || 2,
        tiebreak: (formData.get('tiebreak') as 'gd' | 'gf') || 'gd',
        yellowSusp: parseInt(formData.get('yellowSusp') as string) || 3
      }
    };
    setTournaments([...tournaments, newTournament]);
    setIsCreating(false);
    setSelectedTournamentId(newId);
    setActiveTab('active-tournament');
  };

  const handleCreateFromTemplate = () => {
    const newId = crypto.randomUUID();
    const newTournament: Tournament = {
      id: newId,
      name: 'Novo Grupo de 4 Equipes',
      date: new Date().toISOString().split('T')[0],
      location: 'Arena Local',
      status: 'ongoing',
      format: 'group_knockout',
      teams: [
        { id: crypto.randomUUID(), name: 'Equipe Alpha', players: [], groupId: 'Grupo A' },
        { id: crypto.randomUUID(), name: 'Equipe Beta', players: [], groupId: 'Grupo A' },
        { id: crypto.randomUUID(), name: 'Equipe Gamma', players: [], groupId: 'Grupo A' },
        { id: crypto.randomUUID(), name: 'Equipe Delta', players: [], groupId: 'Grupo A' },
      ],
      matches: []
    };

    // Generate matches
    const teams = newTournament.teams;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        newTournament.matches.push({
          id: crypto.randomUUID(),
          homeTeamId: teams[i].id,
          awayTeamId: teams[j].id,
          date: newTournament.date,
          status: 'scheduled',
          round: 1,
          group: 'Grupo A'
        });
      }
    }

    setTournaments([...tournaments, newTournament]);
    setIsCreating(false);
    setSelectedTournamentId(newId);
    setActiveTab('active-tournament');
  };

  const deleteTournament = (id: string) => {
    setTournaments(tournaments.filter(t => t.id !== id));
    if (selectedTournamentId === id) setSelectedTournamentId(null);
  };

  const updateTournament = (updated: Tournament) => {
    setTournaments(tournaments.map(t => t.id === updated.id ? updated : t));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-display font-bold tracking-tight text-slate-900">Futsal Pro Manager</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setActiveTab('tournaments');
              setSelectedTournamentId(null);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              activeTab === 'tournaments' ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <LayoutDashboard size={18} />
            <span>Meus Torneios</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'tournaments' ? (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-display font-bold text-slate-900">Bem-vindo de volta!</h2>
                  <p className="text-slate-500 mt-1">Gerencie seus campeonatos de futsal com facilidade.</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={loadDemoTournament}
                    className="bg-amber-50 text-amber-700 px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-100 transition-all border border-amber-200"
                  >
                    <Trophy size={20} />
                    Exemplo Profissional
                  </button>
                  <button 
                    onClick={() => setIsCreating(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200"
                  >
                    <Plus size={20} />
                    Novo Torneio
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tournaments.map(tournament => (
                  <TournamentCard 
                    key={tournament.id} 
                    tournament={tournament} 
                    onClick={() => {
                      setSelectedTournamentId(tournament.id);
                      setActiveTab('active-tournament');
                    }}
                    onDelete={() => deleteTournament(tournament.id)}
                  />
                ))}
                {tournaments.length === 0 && (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy className="text-slate-400 w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">Nenhum torneio encontrado</h3>
                    <p className="text-slate-500">Comece criando seu primeiro campeonato.</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {activeTournament && (
                <TournamentDetails 
                  tournament={activeTournament} 
                  onUpdate={updateTournament}
                  onBack={() => {
                    setActiveTab('tournaments');
                    setSelectedTournamentId(null);
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreating(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">Novo Torneio</h3>
                <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleCreateTournament} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Torneio</label>
                  <input required name="name" type="text" placeholder="Ex: Copa da Amizade" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data de Início</label>
                    <input required name="date" type="date" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Formato</label>
                    <select name="format" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="group_knockout">Grupos + Mata-Mata</option>
                      <option value="knockout">Mata-Mata Direto</option>
                      <option value="league">Pontos Corridos</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Times por Grupo</label>
                    <select name="perGroup" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" defaultValue="4">
                      <option value="3">3 times</option>
                      <option value="4">4 times</option>
                      <option value="5">5 times</option>
                      <option value="6">6 times</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Classificados/Grupo</label>
                    <select name="qualify" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" defaultValue="2">
                      <option value="1">1 por grupo</option>
                      <option value="2">2 por grupo</option>
                      <option value="3">3 por grupo</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Critério Desempate</label>
                    <select name="tiebreak" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="gd">Saldo de Gols</option>
                      <option value="gf">Gols Pró</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Suspensão (Amarelos)</label>
                    <input required name="yellowSusp" type="number" defaultValue={3} min={1} max={10} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Local</label>
                  <input required name="location" type="text" placeholder="Ex: Ginásio Municipal" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors mt-4">
                  Criar Torneio
                </button>
                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">Ou use um template</span></div>
                </div>
                <button 
                  type="button"
                  onClick={handleCreateFromTemplate}
                  className="w-full bg-slate-50 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-100 transition-colors border border-slate-200 flex items-center justify-center gap-2"
                >
                  <LayoutDashboard size={18} className="text-indigo-600" />
                  Grupo de 4 Equipes (Round Robin)
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TournamentCard({ tournament, onClick, onDelete }: { tournament: Tournament, onClick: () => void, onDelete: () => void, key?: React.Key }) {
  const statusColors = {
    draft: 'bg-slate-100 text-slate-600',
    ongoing: 'bg-green-100 text-green-700',
    completed: 'bg-indigo-100 text-indigo-700'
  };

  const statusLabels = {
    draft: 'Rascunho',
    ongoing: 'Em Andamento',
    completed: 'Finalizado'
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group relative"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider", statusColors[tournament.status])}>
          {statusLabels[tournament.status]}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-slate-300 hover:text-red-500 transition-colors p-1"
        >
          <Trash2 size={18} />
        </button>
      </div>
      
      <h3 className="text-xl font-display font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
        {tournament.name}
      </h3>
      
      <div className="space-y-2 mb-6">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <Calendar size={16} />
          <span>{format(new Date(tournament.date), 'dd/MM/yyyy')}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <MapPin size={16} />
          <span className="truncate">{tournament.location}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600">
            {tournament.teams.length} Equipes {tournament.format === 'group_knockout' && `(${Math.ceil(tournament.teams.length / 4)} Grupos)`}
          </span>
        </div>
        <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
          <ChevronRight size={20} />
        </div>
      </div>
    </motion.div>
  );
}

function TournamentDetails({ tournament, onUpdate, onBack }: { tournament: Tournament, onUpdate: (t: Tournament) => void, onBack: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'standings' | 'matches' | 'teams' | 'schedule' | 'cards' | 'stats'>('standings');
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);

  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<{ teamId: string, player: Player | null } | null>(null);

  const groupStandings: Record<string, TeamStats[]> = useMemo(() => {
    const stats: Record<string, TeamStats> = {};
    
    tournament.teams.forEach(team => {
      stats[team.id] = {
        teamId: team.id,
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0
      };
    });

    tournament.matches.filter(m => m.status === 'finished').forEach(match => {
      const home = stats[match.homeTeamId];
      const away = stats[match.awayTeamId];
      if (!home || !away) return;

      home.played++;
      away.played++;
      home.goalsFor += match.homeScore || 0;
      home.goalsAgainst += match.awayScore || 0;
      away.goalsFor += match.awayScore || 0;
      away.goalsAgainst += match.homeScore || 0;

      if ((match.homeScore || 0) > (match.awayScore || 0)) {
        home.won++; home.points += 3;
        away.lost++;
      } else if ((match.homeScore || 0) < (match.awayScore || 0)) {
        away.won++; away.points += 3;
        home.lost++;
      } else {
        home.drawn++; home.points += 1;
        away.drawn++; away.points += 1;
      }
    });

    const allStats = Object.values(stats).map(s => ({ 
      ...s, 
      goalDifference: s.goalsFor - s.goalsAgainst 
    }));

    if (tournament.format === 'league') {
      return { 
        'Geral': allStats.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor) 
      };
    }

    const groups: Record<string, TeamStats[]> = {};
    tournament.teams.forEach(team => {
      const gId = team.groupId || 'Sem Grupo';
      if (!groups[gId]) groups[gId] = [];
      const teamStat = allStats.find(s => s.teamId === team.id);
      if (teamStat) groups[gId].push(teamStat);
    });

    Object.keys(groups).forEach(gId => {
      groups[gId].sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
    });

    return groups;
  }, [tournament]);

  const handleAddTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('name') as string;
    const newTeam: Team = { id: crypto.randomUUID(), name, players: [] };
    onUpdate({ ...tournament, teams: [...tournament.teams, newTeam] });
    setIsAddingTeam(false);
  };

  const handleUpdateTournament = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onUpdate({
      ...tournament,
      name: formData.get('name') as string,
      date: formData.get('date') as string,
      location: formData.get('location') as string,
      format: formData.get('format') as any,
    });
    setIsEditingTournament(false);
  };

  const handleUpdateTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeam) return;
    const name = new FormData(e.currentTarget).get('name') as string;
    onUpdate({
      ...tournament,
      teams: tournament.teams.map(t => t.id === editingTeam.id ? { ...t, name } : t)
    });
    setEditingTeam(null);
  };

  const handleAddPlayer = (teamId: string, name: string, number: number) => {
    onUpdate({
      ...tournament,
      teams: tournament.teams.map(t => t.id === teamId ? {
        ...t,
        players: [...t.players, { id: crypto.randomUUID(), name, number }]
      } : t)
    });
    setEditingPlayer(null);
  };

  const handleUpdatePlayer = (teamId: string, playerId: string, name: string, number: number) => {
    onUpdate({
      ...tournament,
      teams: tournament.teams.map(t => t.id === teamId ? {
        ...t,
        players: t.players.map(p => p.id === playerId ? { ...p, name, number } : p)
      } : t)
    });
    setEditingPlayer(null);
  };

  const handleDeletePlayer = (teamId: string, playerId: string) => {
    onUpdate({
      ...tournament,
      teams: tournament.teams.map(t => t.id === teamId ? {
        ...t,
        players: t.players.filter(p => p.id !== playerId)
      } : t)
    });
  };

  const handleDrawGroups = () => {
    if (tournament.teams.length < 4) return;
    
    const teams = [...tournament.teams];
    // Shuffle teams
    for (let i = teams.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teams[i], teams[j]] = [teams[j], teams[i]];
    }

    const perGroup = tournament.config?.perGroup || 4;
    const groups: Record<string, Team[]> = {};
    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    // Assign groups
    teams.forEach((team, idx) => {
      const gIdx = Math.floor(idx / perGroup);
      const gName = `Grupo ${groupNames[gIdx] || (gIdx + 1)}`;
      team.groupId = gName;
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(team);
    });

    const matches: Match[] = [];
    Object.keys(groups).forEach(gName => {
      const gTeams = groups[gName];
      for (let i = 0; i < gTeams.length; i++) {
        for (let j = i + 1; j < gTeams.length; j++) {
          matches.push({
            id: crypto.randomUUID(),
            homeTeamId: gTeams[i].id,
            awayTeamId: gTeams[j].id,
            date: tournament.date,
            status: 'scheduled',
            round: 1,
            group: gName
          });
        }
      }
    });

    onUpdate({ ...tournament, teams, matches: scheduleMatches(matches), status: 'ongoing' });
    setActiveSubTab('schedule');
  };

  const handleAddCard = (card: Omit<Card, 'id'>) => {
    const newCard: Card = {
      ...card,
      id: crypto.randomUUID()
    };
    onUpdate({
      ...tournament,
      cards: [...(tournament.cards || []), newCard]
    });
    setIsAddingCard(false);
  };

  const handleDeleteCard = (cardId: string) => {
    onUpdate({
      ...tournament,
      cards: (tournament.cards || []).filter(c => c.id !== cardId)
    });
  };

  const scorers = useMemo(() => {
    // This is a placeholder as the snippet didn't have full scorer logic
    // But we can derive it from match observations if we had them.
    // For now, let's just return an empty array or mock some data if needed.
    return [];
  }, [tournament]);

  const overallStandings = useMemo(() => {
    const stats: Record<string, TeamStats> = {};
    tournament.teams.forEach(t => {
      stats[t.id] = { teamId: t.id, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
    });

    tournament.matches.filter(m => m.status === 'finished').forEach(m => {
      const h = stats[m.homeTeamId];
      const a = stats[m.awayTeamId];
      if (!h || !a) return;
      h.played++; a.played++;
      h.goalsFor += m.homeScore || 0; h.goalsAgainst += m.awayScore || 0;
      a.goalsFor += m.awayScore || 0; a.goalsAgainst += m.homeScore || 0;
      if ((m.homeScore || 0) > (m.awayScore || 0)) { h.won++; h.points += 3; a.lost++; }
      else if ((m.homeScore || 0) < (m.awayScore || 0)) { a.won++; a.points += 3; h.lost++; }
      else { h.drawn++; h.points += 1; a.drawn++; a.points += 1; }
    });

    return Object.values(stats)
      .map(s => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  }, [tournament]);

  const handleSaveMatch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const matchData = {
      homeTeamId: formData.get('homeTeamId') as string,
      awayTeamId: formData.get('awayTeamId') as string,
      date: formData.get('date') as string,
      round: parseInt(formData.get('round') as string) || 1,
    };

    if (editingMatch?.id) {
      onUpdate({
        ...tournament,
        matches: tournament.matches.map(m => m.id === editingMatch.id ? { ...m, ...matchData } : m)
      });
    } else {
      const newMatch: Match = {
        id: crypto.randomUUID(),
        ...matchData,
        status: 'scheduled',
      };
      onUpdate({ ...tournament, matches: [...tournament.matches, newMatch] });
    }
    setEditingMatch(null);
  };

  const handleDeleteMatch = (matchId: string) => {
    onUpdate({ ...tournament, matches: tournament.matches.filter(m => m.id !== matchId) });
  };

  const generateKnockoutMatches = () => {
    if (tournament.format !== 'group_knockout') return;

    const groupMatches = tournament.matches.filter(m => m.group?.startsWith('Grupo'));
    const knockoutMatchesExist = tournament.matches.some(m => !m.group?.startsWith('Grupo'));
    
    if (knockoutMatchesExist) return;

    const allFinished = groupMatches.length > 0 && groupMatches.every(m => m.status === 'finished');
    if (!allFinished) return;

    const groupIds = Object.keys(groupStandings).sort();
    const qualifiers: { teamId: string, group: string, rank: number }[] = [];
    
    groupIds.forEach(gId => {
      const standings = groupStandings[gId];
      if (standings.length >= 2) {
        qualifiers.push({ teamId: standings[0].teamId, group: gId, rank: 1 });
        qualifiers.push({ teamId: standings[1].teamId, group: gId, rank: 2 });
      }
    });

    const knockoutMatches: Match[] = [];
    const nextRound = Math.max(...tournament.matches.map(m => m.round), 0) + 1;

    if (groupIds.length === 2) {
      const gA = groupIds[0];
      const gB = groupIds[1];
      const t1A = qualifiers.find(q => q.group === gA && q.rank === 1);
      const t2A = qualifiers.find(q => q.group === gA && q.rank === 2);
      const t1B = qualifiers.find(q => q.group === gB && q.rank === 1);
      const t2B = qualifiers.find(q => q.group === gB && q.rank === 2);

      if (t1A && t2B) {
        knockoutMatches.push({
          id: crypto.randomUUID(),
          homeTeamId: t1A.teamId,
          awayTeamId: t2B.teamId,
          date: tournament.date,
          status: 'scheduled',
          round: nextRound,
          group: 'Semifinal'
        });
      }
      if (t1B && t2A) {
        knockoutMatches.push({
          id: crypto.randomUUID(),
          homeTeamId: t1B.teamId,
          awayTeamId: t2A.teamId,
          date: tournament.date,
          status: 'scheduled',
          round: nextRound,
          group: 'Semifinal'
        });
      }
    }

    if (knockoutMatches.length > 0) {
      onUpdate({ ...tournament, matches: [...tournament.matches, ...knockoutMatches] });
      setActiveSubTab('matches');
    }
  };

  const generateFinalMatch = () => {
    const semiMatches = tournament.matches.filter(m => m.group === 'Semifinal');
    const finalMatchExists = tournament.matches.some(m => m.group === 'Final');
    
    if (finalMatchExists) return;

    const allFinished = semiMatches.length === 2 && semiMatches.every(m => m.status === 'finished');
    if (!allFinished) return;

    const winners = semiMatches.map(m => (m.homeScore || 0) > (m.awayScore || 0) ? m.homeTeamId : m.awayTeamId);
    
    const finalMatch: Match = {
      id: crypto.randomUUID(),
      homeTeamId: winners[0],
      awayTeamId: winners[1],
      date: tournament.date,
      status: 'scheduled',
      round: Math.max(...tournament.matches.map(m => m.round)) + 1,
      group: 'Final'
    };

    onUpdate({ ...tournament, matches: [...tournament.matches, finalMatch] });
    setActiveSubTab('matches');
  };

  const updateMatchScore = (matchId: string, homeScore: number, awayScore: number) => {
    const updatedMatches = tournament.matches.map(m => 
      m.id === matchId ? { ...m, homeScore, awayScore, status: 'finished' as const } : m
    );
    
    // Check if the tournament is finished
    const isFinal = tournament.matches.find(m => m.id === matchId)?.group === 'Final';
    let status = tournament.status;
    if (isFinal) status = 'completed';

    onUpdate({ ...tournament, matches: updatedMatches, status });
  };

  const winner = useMemo(() => {
    if (tournament.status !== 'completed') return null;
    const finalMatch = tournament.matches.find(m => m.group === 'Final');
    if (!finalMatch || finalMatch.status !== 'finished') return null;
    return (finalMatch.homeScore || 0) > (finalMatch.awayScore || 0) 
      ? tournament.teams.find(t => t.id === finalMatch.homeTeamId)
      : tournament.teams.find(t => t.id === finalMatch.awayTeamId);
  }, [tournament]);

  const knockoutMatches = useMemo(() => {
    return tournament.matches.filter(m => !m.group?.startsWith('Grupo') && m.group !== 'Geral');
  }, [tournament]);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium">
        <ChevronRight className="rotate-180" size={20} />
        Voltar para a lista
      </button>

      {winner && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-600 rounded-3xl p-8 text-white flex flex-col items-center text-center gap-4 shadow-xl shadow-indigo-200 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-20%] w-[140%] h-[200%] bg-[radial-gradient(circle,white_0%,transparent_70%)]" />
          </div>
          <Trophy size={64} className="text-amber-400 drop-shadow-lg" />
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Grande Campeão</h2>
            <h3 className="text-4xl font-display font-black">{winner.name}</h3>
          </div>
          <div className="bg-white/20 px-6 py-2 rounded-full text-sm font-bold backdrop-blur-sm">
            Torneio Finalizado com Sucesso
          </div>
        </motion.div>
      )}

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">{tournament.name}</h2>
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                tournament.status === 'draft' ? "bg-slate-100 text-slate-600" : 
                tournament.status === 'ongoing' ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"
              )}>
                {tournament.status === 'draft' ? 'Configuração' : 
                 tournament.status === 'ongoing' ? 'Em Andamento' : 'Finalizado'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm">
              <div className="flex items-center gap-1.5">
                <Calendar size={16} />
                <span>{format(new Date(tournament.date), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin size={16} />
                <span>{tournament.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users size={16} />
                <span>{tournament.teams.length} Equipes</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {tournament.status === 'draft' && (
              <div className="hidden lg:flex items-center gap-2 mr-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                <div className={cn("w-2 h-2 rounded-full", tournament.teams.length >= 4 ? "bg-green-500" : "bg-slate-300")} />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {tournament.teams.length < 4 ? `Faltam ${4 - tournament.teams.length} equipes` : 'Pronto para Sorteio'}
                </span>
              </div>
            )}
            {tournament.status === 'ongoing' && tournament.format === 'group_knockout' && (
              <>
                {tournament.matches.filter(m => m.group?.startsWith('Grupo')).every(m => m.status === 'finished') && 
                 !tournament.matches.some(m => m.group === 'Semifinal') && (
                  <button 
                    onClick={generateKnockoutMatches}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
                  >
                    <Trophy size={18} />
                    Gerar Semifinais
                  </button>
                )}
                {tournament.matches.filter(m => m.group === 'Semifinal').length === 2 && 
                 tournament.matches.filter(m => m.group === 'Semifinal').every(m => m.status === 'finished') && 
                 !tournament.matches.some(m => m.group === 'Final') && (
                  <button 
                    onClick={generateFinalMatch}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-md"
                  >
                    <Trophy size={18} />
                    Gerar Final
                  </button>
                )}
              </>
            )}
            
            {tournament.status === 'draft' && (
              <button 
                onClick={() => {
                  setActiveSubTab('teams');
                  setIsAddingTeam(true);
                }}
                className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all"
              >
                <Plus size={18} />
                Equipe
              </button>
            )}
            
            {tournament.status === 'draft' && tournament.teams.length >= 2 && tournament.matches.length === 0 && (
              <button 
                onClick={() => {
                  const teams = [...tournament.teams];
                  // Shuffle teams
                  for (let i = teams.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [teams[i], teams[j]] = [teams[j], teams[i]];
                  }

                  const groups: Record<string, Team[]> = {};
                  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                  const perGroup = tournament.config?.perGroup || 4;
                  
                  // Assign groups
                  teams.forEach((team, idx) => {
                    const gIdx = Math.floor(idx / perGroup);
                    const gName = `Grupo ${groupNames[gIdx] || (gIdx + 1)}`;
                    team.groupId = gName;
                    if (!groups[gName]) groups[gName] = [];
                    groups[gName].push(team);
                  });

                  const matches: Match[] = [];
                  Object.keys(groups).forEach(gName => {
                    const gTeams = groups[gName];
                    const gMatches = generateRoundRobin(gTeams, gName, tournament.date);
                    matches.push(...gMatches);
                  });

                  onUpdate({ ...tournament, teams, matches: scheduleMatches(matches) });
                  setActiveSubTab('schedule');
                }}
                className="bg-amber-50 text-amber-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-100 transition-all border border-amber-200"
              >
                <Calendar size={18} />
                Gerar Partidas
              </button>
            )}

            {tournament.status === 'draft' && tournament.teams.length >= 2 && (
              <button 
                onClick={() => {
                  let updatedTournament = { ...tournament, status: 'ongoing' as const };
                  if (tournament.matches.length === 0) {
                    const teams = [...tournament.teams];
                    // Shuffle teams
                    for (let i = teams.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [teams[i], teams[j]] = [teams[j], teams[i]];
                    }

                    const groups: Record<string, Team[]> = {};
                    const groupNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
                    
                    teams.forEach((team, idx) => {
                      const gIdx = Math.floor(idx / 4);
                      const gName = `Grupo ${groupNames[gIdx] || (gIdx + 1)}`;
                      team.groupId = gName;
                      if (!groups[gName]) groups[gName] = [];
                      groups[gName].push(team);
                    });

                    const matches: Match[] = [];
                    Object.keys(groups).forEach(gName => {
                      const gTeams = groups[gName];
                      for (let i = 0; i < gTeams.length; i++) {
                        for (let j = i + 1; j < gTeams.length; j++) {
                          matches.push({
                            id: crypto.randomUUID(),
                            homeTeamId: gTeams[i].id,
                            awayTeamId: gTeams[j].id,
                            date: tournament.date,
                            status: 'scheduled',
                            round: 1,
                            group: gName
                          });
                        }
                      }
                    });
                    updatedTournament.teams = teams;
                    updatedTournament.matches = scheduleMatches(matches);
                  }
                  onUpdate(updatedTournament);
                  setActiveSubTab('schedule');
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-100"
              >
                <Play size={20} />
                Iniciar
              </button>
            )}
            <button 
              onClick={() => setIsEditingTournament(true)}
              className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 mb-6 overflow-x-auto">
          {[
            { id: 'standings', label: 'Classificação', icon: Trophy },
            { id: 'matches', label: 'Partidas', icon: Calendar },
            { id: 'schedule', label: 'Gestão de Partidas', icon: LayoutDashboard },
            { id: 'teams', label: 'Equipes', icon: Users },
            { id: 'cards', label: 'Cartões', icon: CheckCircle2 },
            { id: 'stats', label: 'Estatísticas', icon: LayoutDashboard },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 -mb-[2px] whitespace-nowrap",
                activeSubTab === tab.id 
                  ? "border-indigo-600 text-indigo-600" 
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeSubTab === 'standings' && (
            <div className="space-y-12">
              {Object.entries(groupStandings).map(([groupName, stats]) => (
                <div key={groupName} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                    <h3 className="text-xl font-bold text-slate-900">{groupName}</h3>
                  </div>
                  <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 bg-slate-50/50">
                          <th className="px-6 py-4">Pos</th>
                          <th className="px-6 py-4">Equipe</th>
                          <th className="px-4 py-4 text-center">P</th>
                          <th className="px-4 py-4 text-center">J</th>
                          <th className="px-4 py-4 text-center">V</th>
                          <th className="px-4 py-4 text-center">E</th>
                          <th className="px-4 py-4 text-center">D</th>
                          <th className="px-4 py-4 text-center">GP</th>
                          <th className="px-4 py-4 text-center">GC</th>
                          <th className="px-4 py-4 text-center">SG</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {stats.map((stat, idx) => (
                          <tr key={stat.teamId} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}º</td>
                            <td className="px-6 py-4 font-bold text-slate-900">
                              {tournament.teams.find(t => t.id === stat.teamId)?.name}
                            </td>
                            <td className="px-4 py-4 text-center font-black text-indigo-600">{stat.points}</td>
                            <td className="px-4 py-4 text-center text-slate-600 font-medium">{stat.played}</td>
                            <td className="px-4 py-4 text-center text-slate-600">{stat.won}</td>
                            <td className="px-4 py-4 text-center text-slate-600">{stat.drawn}</td>
                            <td className="px-4 py-4 text-center text-slate-600">{stat.lost}</td>
                            <td className="px-4 py-4 text-center text-slate-600">{stat.goalsFor}</td>
                            <td className="px-4 py-4 text-center text-slate-600">{stat.goalsAgainst}</td>
                            <td className="px-4 py-4 text-center font-bold text-slate-900">{stat.goalDifference}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              
              {knockoutMatches.length > 0 && (
                <div className="space-y-6 pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-amber-500 rounded-full" />
                    <h3 className="text-xl font-bold text-slate-900">Fase Eliminatória</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(Object.entries(
                      knockoutMatches.reduce((acc, match) => {
                        const g = match.group || 'Mata-Mata';
                        if (!acc[g]) acc[g] = [];
                        acc[g].push(match);
                        return acc;
                      }, {} as Record<string, Match[]>)
                    ) as [string, Match[]][]).sort((a, b) => {
                      if (a[0] === 'Semifinal') return -1;
                      if (b[0] === 'Semifinal') return 1;
                      return 0;
                    }).map(([phase, matches]) => (
                      <div key={phase} className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">{phase}</h4>
                        <div className="space-y-2">
                          {matches.map(m => (
                            <div key={m.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                              <div className="flex-1 text-right font-bold text-slate-700 text-sm">
                                {tournament.teams.find(t => t.id === m.homeTeamId)?.name}
                              </div>
                              <div className="mx-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 text-xs">
                                  {m.homeScore ?? '-'}
                                </span>
                                <span className="text-slate-300 font-bold text-xs">x</span>
                                <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 text-xs">
                                  {m.awayScore ?? '-'}
                                </span>
                              </div>
                              <div className="flex-1 text-left font-bold text-slate-700 text-sm">
                                {tournament.teams.find(t => t.id === m.awayTeamId)?.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'matches' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">{tournament.matches.length} Partidas</h3>
                <div className="flex gap-2">
                  {tournament.teams.length >= 2 && (
                    <button 
                      onClick={() => {
                        const matches = generateRoundRobin(tournament.teams, 'Geral', tournament.date);
                        onUpdate({ ...tournament, matches: scheduleMatches(matches) });
                        setActiveSubTab('schedule');
                      }}
                      className="flex items-center gap-2 text-amber-600 font-bold hover:bg-amber-50 px-4 py-2 rounded-xl transition-all"
                      title="Gera partidas todos contra todos, independente de grupos"
                    >
                      <Calendar size={20} />
                      Gerar Automáticas
                    </button>
                  )}
                  <button 
                    onClick={() => setEditingMatch({ id: '', homeTeamId: '', awayTeamId: '', date: tournament.date, status: 'scheduled', round: 1 })}
                    className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                  >
                    <Plus size={20} />
                    Nova Partida
                  </button>
                </div>
              </div>

              {tournament.matches.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500">Nenhuma partida gerada ainda.</p>
                </div>
              )}

              {Object.entries(
                tournament.matches.reduce((acc, match) => {
                  const g = match.group || 'Geral';
                  if (!acc[g]) acc[g] = [];
                  acc[g].push(match);
                  return acc;
                }, {} as Record<string, Match[]>)
              ).map(([groupName, matches]) => (
                <div key={groupName} className="space-y-4">
                  {groupName !== 'Geral' && (
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{groupName}</h4>
                    </div>
                  )}
                  <div className="space-y-3">
                    {matches.map(match => (
                      <MatchRow 
                        key={match.id} 
                        match={match} 
                        teams={tournament.teams}
                        onUpdateScore={(h, a) => updateMatchScore(match.id, h, a)}
                        onEdit={() => { setEditingMatch(match); }}
                        onDelete={() => handleDeleteMatch(match.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSubTab === 'schedule' && (
            <div className="space-y-8">
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-3 mb-2">
                  <LayoutDashboard className="text-indigo-600" size={24} />
                  <h3 className="text-xl font-bold text-indigo-900">Gestão de Fluxo de Partidas</h3>
                </div>
                <p className="text-indigo-700 text-sm">
                  Esta aba organiza as partidas para garantir que nenhuma equipe jogue duas vezes seguidas, 
                  otimizando o tempo de descanso e o fluxo do torneio.
                </p>
              </div>

              {tournament.matches.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500">Gere as partidas primeiro para ver a gestão de fluxo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduleMatches(tournament.matches).map((match, index) => (
                    <div key={match.id} className="relative">
                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 z-10 shadow-sm">
                        {index + 1}
                      </div>
                      <div className="ml-4">
                        <MatchRow 
                          match={match} 
                          teams={tournament.teams}
                          onUpdateScore={(h, a) => updateMatchScore(match.id, h, a)}
                          onEdit={() => { setEditingMatch(match); }}
                          onDelete={() => handleDeleteMatch(match.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'cards' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Controle de Cartões</h3>
                <button 
                  onClick={() => setIsAddingCard(true)}
                  className="flex items-center gap-2 bg-amber-500 text-white font-bold hover:bg-amber-600 px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  <Plus size={20} />
                  Registrar Cartão
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Amarelos</p>
                    <p className="text-2xl font-black text-slate-900">{(tournament.cards || []).filter(c => c.type === 'yellow').length}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                    <X size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Vermelhos</p>
                    <p className="text-2xl font-black text-slate-900">{(tournament.cards || []).filter(c => c.type === 'red').length}</p>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 font-medium">Suspensos</p>
                    <p className="text-2xl font-black text-slate-900">
                      {Object.entries((tournament.cards || []).reduce((acc, c) => {
                        const key = `${c.playerName}-${c.teamId}`;
                        if (c.type === 'red') acc[key] = true;
                        else {
                          acc[key] = (acc[key] || 0) + 1;
                        }
                        return acc;
                      }, {} as Record<string, any>)).filter(([_, val]) => val === true || val >= (tournament.config?.yellowSusp || 3)).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-100 shadow-sm">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50 bg-slate-50/50">
                      <th className="px-6 py-4">Jogador</th>
                      <th className="px-6 py-4">Equipe</th>
                      <th className="px-4 py-4 text-center">Tipo</th>
                      <th className="px-6 py-4">Motivo</th>
                      <th className="px-4 py-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(tournament.cards || []).map(card => (
                      <tr key={card.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">{card.playerName}</td>
                        <td className="px-6 py-4 text-slate-600">
                          {tournament.teams.find(t => t.id === card.teamId)?.name}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase",
                            card.type === 'yellow' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                          )}>
                            {card.type === 'yellow' ? 'Amarelo' : 'Vermelho'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{card.reason || '—'}</td>
                        <td className="px-4 py-4 text-center">
                          <button onClick={() => handleDeleteCard(card.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(tournament.cards || []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Nenhum cartão registrado</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSubTab === 'stats' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-sm text-slate-500 font-medium mb-1">Total Jogos</p>
                  <p className="text-3xl font-black text-indigo-600">{tournament.matches.filter(m => m.status === 'finished').length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-sm text-slate-500 font-medium mb-1">Gols Marcados</p>
                  <p className="text-3xl font-black text-indigo-600">
                    {tournament.matches.reduce((acc, m) => acc + (m.homeScore || 0) + (m.awayScore || 0), 0)}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-sm text-slate-500 font-medium mb-1">Média de Gols</p>
                  <p className="text-3xl font-black text-indigo-600">
                    {tournament.matches.filter(m => m.status === 'finished').length > 0 
                      ? (tournament.matches.reduce((acc, m) => acc + (m.homeScore || 0) + (m.awayScore || 0), 0) / tournament.matches.filter(m => m.status === 'finished').length).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <p className="text-sm text-slate-500 font-medium mb-1">Equipes</p>
                  <p className="text-3xl font-black text-indigo-600">{tournament.teams.length}</p>
                </div>
              </div>

              <div className="card bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <Trophy size={20} className="text-amber-500" />
                  Classificação Geral
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-50">
                        <th className="px-4 py-4">Pos</th>
                        <th className="px-4 py-4">Equipe</th>
                        <th className="px-4 py-4 text-center">P</th>
                        <th className="px-4 py-4 text-center">J</th>
                        <th className="px-4 py-4 text-center">V</th>
                        <th className="px-4 py-4 text-center">E</th>
                        <th className="px-4 py-4 text-center">D</th>
                        <th className="px-4 py-4 text-center">GP</th>
                        <th className="px-4 py-4 text-center">GC</th>
                        <th className="px-4 py-4 text-center">SG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {overallStandings.map((stat, idx) => (
                        <tr key={stat.teamId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 font-bold text-slate-400">{idx + 1}º</td>
                          <td className="px-4 py-4 font-bold text-slate-900">
                            {tournament.teams.find(t => t.id === stat.teamId)?.name}
                          </td>
                          <td className="px-4 py-4 text-center font-black text-indigo-600">{stat.points}</td>
                          <td className="px-4 py-4 text-center text-slate-600">{stat.played}</td>
                          <td className="px-4 py-4 text-center text-slate-600">{stat.won}</td>
                          <td className="px-4 py-4 text-center text-slate-600">{stat.drawn}</td>
                          <td className="px-4 py-4 text-center text-slate-600">{stat.lost}</td>
                          <td className="px-4 py-4 text-center text-slate-600">{stat.goalsFor}</td>
                          <td className="px-4 py-4 text-center text-slate-600">{stat.goalsAgainst}</td>
                          <td className="px-4 py-4 text-center font-bold text-slate-900">{stat.goalDifference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {activeSubTab === 'teams' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">{tournament.teams.length} Equipes Inscritas</h3>
                <div className="flex gap-2">
                  {tournament.status === 'draft' && tournament.teams.length >= 4 && (
                    <button 
                      onClick={handleDrawGroups}
                      className="flex items-center gap-2 bg-amber-500 text-white font-bold hover:bg-amber-600 px-4 py-2 rounded-xl transition-all shadow-sm"
                    >
                      <Play size={18} />
                      Realizar Sorteio
                    </button>
                  )}
                  <button 
                    onClick={() => setIsAddingTeam(true)}
                    className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                  >
                    <Plus size={20} />
                    Adicionar Equipe
                  </button>
                </div>
              </div>

              {tournament.teams.length === 0 && !isAddingTeam && (
                <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <Users className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500 mb-4">Nenhuma equipe cadastrada neste torneio.</p>
                  <button 
                    onClick={() => setIsAddingTeam(true)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all"
                  >
                    Cadastrar Primeira Equipe
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tournament.teams.map(team => (
                  <div key={team.id} className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-4 group border border-transparent hover:border-indigo-100 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-indigo-600 shadow-sm">
                          {team.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{team.name}</h4>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-slate-500">{team.players.length} Jogadores</p>
                            {team.groupId && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-xs font-bold text-indigo-600">{team.groupId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setEditingTeam(team)}
                          className="text-slate-400 hover:text-indigo-600 p-2 transition-all"
                        >
                          <Settings size={18} />
                        </button>
                        <button 
                          onClick={() => onUpdate({ ...tournament, teams: tournament.teams.filter(t => t.id !== team.id) })}
                          className="text-slate-400 hover:text-red-500 p-2 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Players List */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jogadores</span>
                        <button 
                          onClick={() => setEditingPlayer({ teamId: team.id, player: null })}
                          className="text-[10px] font-bold text-indigo-600 hover:underline"
                        >
                          + Adicionar
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {team.players.map(player => (
                          <div key={player.id} className="bg-white px-2 py-1 rounded-lg text-xs flex items-center gap-2 border border-slate-100 group/player">
                            <span className="font-bold text-indigo-600">#{player.number}</span>
                            <span className="text-slate-700">{player.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover/player:opacity-100 transition-all">
                              <button onClick={() => setEditingPlayer({ teamId: team.id, player })} className="text-slate-300 hover:text-indigo-600">
                                <Settings size={12} />
                              </button>
                              <button onClick={() => handleDeletePlayer(team.id, player.id)} className="text-slate-300 hover:text-red-500">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {team.players.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum jogador</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isAddingTeam && (
                <motion.form 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleAddTeam} 
                  className="bg-indigo-50 p-6 rounded-3xl flex flex-col md:flex-row gap-4 items-end"
                >
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-bold text-indigo-900 mb-2">Nome da Equipe</label>
                    <input autoFocus required name="name" type="text" placeholder="Ex: Galácticos F.C." className="w-full px-4 py-3 rounded-xl bg-white border-2 border-indigo-100 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button type="submit" className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setIsAddingTeam(false)} className="bg-white text-slate-500 px-4 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all">
                      Cancelar
                    </button>
                  </div>
                </motion.form>
              )}
            </div>
          )}
        </div>

      {/* Edit Tournament Modal */}
      <AnimatePresence>
        {isEditingTournament && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditingTournament(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">Editar Torneio</h3>
                <button onClick={() => setIsEditingTournament(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleUpdateTournament} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                  <input required name="name" defaultValue={tournament.name} type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                    <input required name="date" defaultValue={tournament.date} type="date" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Formato</label>
                    <select name="format" defaultValue={tournament.format} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none">
                      <option value="league">Pontos Corridos</option>
                      <option value="knockout">Mata-Mata</option>
                      <option value="group_knockout">Grupos + Mata-Mata</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Local</label>
                  <input required name="location" defaultValue={tournament.location} type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">Salvar Alterações</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Team Modal */}
        {editingTeam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingTeam(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">Editar Equipe</h3>
                <button onClick={() => setEditingTeam(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleUpdateTeam} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Equipe</label>
                  <input required name="name" defaultValue={editingTeam.name} type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">Salvar Alterações</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit/Add Match Modal */}
        {editingMatch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingMatch(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">{editingMatch.id ? 'Editar Partida' : 'Nova Partida'}</h3>
                <button onClick={() => setEditingMatch(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveMatch} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mandante</label>
                    <select required name="homeTeamId" defaultValue={editingMatch.homeTeamId} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none">
                      <option value="">Selecione...</option>
                      {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Visitante</label>
                    <select required name="awayTeamId" defaultValue={editingMatch.awayTeamId} className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none">
                      <option value="">Selecione...</option>
                      {tournament.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                    <input required name="date" defaultValue={editingMatch.date} type="datetime-local" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rodada</label>
                    <input required name="round" defaultValue={editingMatch.round} type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">Salvar Partida</button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit/Add Player Modal */}
        {editingPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingPlayer(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-display font-bold">{editingPlayer.player ? 'Editar Jogador' : 'Novo Jogador'}</h3>
                <button onClick={() => setEditingPlayer(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const name = formData.get('name') as string;
                  const number = parseInt(formData.get('number') as string) || 0;
                  if (editingPlayer.player) {
                    handleUpdatePlayer(editingPlayer.teamId, editingPlayer.player.id, name, number);
                  } else {
                    handleAddPlayer(editingPlayer.teamId, name, number);
                  }
                }} 
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Jogador</label>
                  <input required name="name" defaultValue={editingPlayer.player?.name} type="text" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número da Camisa</label>
                  <input required name="number" defaultValue={editingPlayer.player?.number} type="number" className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                  {editingPlayer.player ? 'Salvar Alterações' : 'Adicionar Jogador'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Card Modal */}
        {isAddingCard && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingCard(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-500 text-white">
                <h3 className="text-xl font-display font-bold">Registrar Cartão</h3>
                <button onClick={() => setIsAddingCard(false)} className="text-white/80 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const teamId = formData.get('teamId') as string;
                  handleAddCard({
                    teamId,
                    playerName: formData.get('playerName') as string,
                    type: formData.get('type') as 'yellow' | 'red',
                    reason: formData.get('reason') as string,
                    date: new Date().toISOString()
                  });
                }} 
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Equipe</label>
                  <select required name="teamId" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">Selecione a Equipe</option>
                    {tournament.teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Jogador</label>
                  <input required name="playerName" type="text" placeholder="Nome do Jogador" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cartão</label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all">
                      <input type="radio" name="type" value="yellow" defaultChecked className="text-amber-500 focus:ring-amber-500" />
                      <span className="font-bold text-amber-600">Amarelo</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all">
                      <input type="radio" name="type" value="red" className="text-red-500 focus:ring-red-500" />
                      <span className="font-bold text-red-600">Vermelho</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Motivo (Opcional)</label>
                  <textarea name="reason" rows={2} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="Ex: Falta temerária" />
                </div>
                <button type="submit" className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors mt-4">
                  Confirmar Registro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

function MatchRow({ match, teams, onUpdateScore, onEdit, onDelete }: { match: Match, teams: Team[], onUpdateScore: (h: number, a: number) => void, onEdit: () => void, onDelete: () => void, key?: string }) {
  const homeTeam = teams.find(t => t.id === match.homeTeamId);
  const awayTeam = teams.find(t => t.id === match.awayTeamId);
  const [isEditing, setIsEditing] = useState(false);
  const [scores, setScores] = useState({ home: match.homeScore || 0, away: match.awayScore || 0 });

  if (!homeTeam || !awayTeam) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-sm transition-all group relative">
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="text-slate-300 hover:text-indigo-600 p-2"
        >
          <Settings size={16} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-slate-300 hover:text-red-500 p-2"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-end gap-4 w-full md:w-auto">
        <div className="flex flex-col items-end">
          <span className="font-bold text-slate-900 text-lg text-right">{homeTeam.name}</span>
          {match.group && <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{match.group}</span>}
        </div>
        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center font-bold text-slate-400">
          {homeTeam.name.charAt(0)}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={scores.home} 
              onChange={e => setScores({ ...scores, home: parseInt(e.target.value) || 0 })}
              className="w-14 h-14 text-center text-2xl font-bold bg-slate-50 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 outline-none"
            />
            <span className="text-slate-300 font-bold">X</span>
            <input 
              type="number" 
              value={scores.away} 
              onChange={e => setScores({ ...scores, away: parseInt(e.target.value) || 0 })}
              className="w-14 h-14 text-center text-2xl font-bold bg-slate-50 rounded-xl border-2 border-indigo-100 focus:border-indigo-500 outline-none"
            />
            <button 
              onClick={() => {
                onUpdateScore(scores.home, scores.away);
                setIsEditing(false);
              }}
              className="ml-2 bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-all"
            >
              <Save size={20} />
            </button>
          </div>
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-6 cursor-pointer group/score"
          >
            <div className="text-4xl font-display font-black text-slate-900 w-12 text-center">
              {match.status === 'finished' ? match.homeScore : '-'}
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">VS</span>
              {match.status === 'finished' ? (
                <CheckCircle2 className="text-green-500" size={16} />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-200" />
              )}
            </div>
            <div className="text-4xl font-display font-black text-slate-900 w-12 text-center">
              {match.status === 'finished' ? match.awayScore : '-'}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-start gap-4 w-full md:w-auto">
        <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center font-bold text-slate-400">
          {awayTeam.name.charAt(0)}
        </div>
        <span className="font-bold text-slate-900 text-lg">{awayTeam.name}</span>
      </div>
    </div>
  );
}
