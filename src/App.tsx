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
import { Tournament, Team, Match, TeamStats, Player } from './types';

// --- Mock Initial Data ---
const INITIAL_TOURNAMENTS: Tournament[] = [
  {
    id: '1',
    name: 'Copa Verão Futsal 2024',
    date: '2024-06-15',
    location: 'Ginásio Poliesportivo Central',
    status: 'ongoing',
    format: 'league',
    teams: [
      { id: 't1', name: 'Dragões da Vila', players: [] },
      { id: 't2', name: 'Fênix F.C.', players: [] },
      { id: 't3', name: 'União Futsal', players: [] },
      { id: 't4', name: 'Atlético Real', players: [] },
    ],
    matches: [
      { id: 'm1', homeTeamId: 't1', awayTeamId: 't2', homeScore: 3, awayScore: 2, date: '2024-06-15T14:00:00', status: 'finished', round: 1 },
      { id: 'm2', homeTeamId: 't3', awayTeamId: 't4', homeScore: 1, awayScore: 1, date: '2024-06-15T15:30:00', status: 'finished', round: 1 },
      { id: 'm3', homeTeamId: 't1', awayTeamId: 't3', date: '2024-06-22T14:00:00', status: 'scheduled', round: 2 },
      { id: 'm4', homeTeamId: 't2', awayTeamId: 't4', date: '2024-06-22T15:30:00', status: 'scheduled', round: 2 },
    ]
  }
];

export default function App() {
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem('futsal_tournaments');
    return saved ? JSON.parse(saved) : INITIAL_TOURNAMENTS;
  });
  
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
      matches: []
    };
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
                <button 
                  onClick={() => setIsCreating(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200"
                >
                  <Plus size={20} />
                  Novo Torneio
                </button>
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
                      <option value="league">Pontos Corridos</option>
                      <option value="knockout">Mata-Mata</option>
                      <option value="group_knockout">Grupos + Mata-Mata</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Local</label>
                  <input required name="location" type="text" placeholder="Ex: Ginásio Municipal" className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors mt-4">
                  Criar Torneio
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
          <span className="text-sm font-medium text-slate-600">{tournament.teams.length} Equipes</span>
        </div>
        <div className="bg-slate-50 p-2 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
          <ChevronRight size={20} />
        </div>
      </div>
    </motion.div>
  );
}

function TournamentDetails({ tournament, onUpdate, onBack }: { tournament: Tournament, onUpdate: (t: Tournament) => void, onBack: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'standings' | 'matches' | 'teams'>('standings');
  const [isAddingTeam, setIsAddingTeam] = useState(false);

  const standings: TeamStats[] = useMemo(() => {
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

    return Object.values(stats)
      .map(s => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
      .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
  }, [tournament]);

  const handleAddTeam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = new FormData(e.currentTarget).get('name') as string;
    const newTeam: Team = { id: crypto.randomUUID(), name, players: [] };
    onUpdate({ ...tournament, teams: [...tournament.teams, newTeam] });
    setIsAddingTeam(false);
  };

  const updateMatchScore = (matchId: string, homeScore: number, awayScore: number) => {
    const updatedMatches = tournament.matches.map(m => 
      m.id === matchId ? { ...m, homeScore, awayScore, status: 'finished' as const } : m
    );
    onUpdate({ ...tournament, matches: updatedMatches });
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium">
        <ChevronRight className="rotate-180" size={20} />
        Voltar para a lista
      </button>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-3xl font-display font-bold text-slate-900">{tournament.name}</h2>
              <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {tournament.format === 'league' ? 'Pontos Corridos' : 'Mata-Mata'}
              </span>
            </div>
            <div className="flex flex-wrap gap-4 text-slate-500">
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <span>{format(new Date(tournament.date), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span>{tournament.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={18} />
                <span>{tournament.teams.length} Equipes</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            {tournament.status === 'draft' && (
              <button 
                onClick={() => {
                  setActiveSubTab('teams');
                  setIsAddingTeam(true);
                }}
                className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-100 transition-all"
              >
                <Plus size={18} />
                Adicionar Equipe
              </button>
            )}
            {tournament.status === 'draft' && tournament.teams.length >= 2 && (
              <button 
                onClick={() => onUpdate({ ...tournament, status: 'ongoing' })}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all"
              >
                <Play size={20} />
                Iniciar Torneio
              </button>
            )}
            <button className="p-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
              <Settings size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 mb-6">
          {[
            { id: 'standings', label: 'Classificação', icon: Trophy },
            { id: 'matches', label: 'Partidas', icon: Calendar },
            { id: 'teams', label: 'Equipes', icon: Users },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 -mb-[2px]",
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
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 text-xs font-bold uppercase tracking-wider border-b border-slate-50">
                    <th className="px-4 py-3">Pos</th>
                    <th className="px-4 py-3">Equipe</th>
                    <th className="px-4 py-3 text-center">P</th>
                    <th className="px-4 py-3 text-center">J</th>
                    <th className="px-4 py-3 text-center">V</th>
                    <th className="px-4 py-3 text-center">E</th>
                    <th className="px-4 py-3 text-center">D</th>
                    <th className="px-4 py-3 text-center">GP</th>
                    <th className="px-4 py-3 text-center">GC</th>
                    <th className="px-4 py-3 text-center">SG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {standings.map((stat, idx) => (
                    <tr key={stat.teamId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-4 font-bold text-slate-400">{idx + 1}º</td>
                      <td className="px-4 py-4 font-bold text-slate-900">
                        {tournament.teams.find(t => t.id === stat.teamId)?.name}
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-indigo-600">{stat.points}</td>
                      <td className="px-4 py-4 text-center text-slate-600">{stat.played}</td>
                      <td className="px-4 py-4 text-center text-slate-600">{stat.won}</td>
                      <td className="px-4 py-4 text-center text-slate-600">{stat.drawn}</td>
                      <td className="px-4 py-4 text-center text-slate-600">{stat.lost}</td>
                      <td className="px-4 py-4 text-center text-slate-600">{stat.goalsFor}</td>
                      <td className="px-4 py-4 text-center text-slate-600">{stat.goalsAgainst}</td>
                      <td className="px-4 py-4 text-center font-medium text-slate-900">{stat.goalDifference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeSubTab === 'matches' && (
            <div className="space-y-4">
              {tournament.matches.length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
                  <p className="text-slate-500">Nenhuma partida gerada ainda.</p>
                  {tournament.status === 'draft' && tournament.teams.length >= 2 && (
                    <button 
                      onClick={() => {
                        // Simple Round Robin generator
                        const matches: Match[] = [];
                        const teams = tournament.teams;
                        for (let i = 0; i < teams.length; i++) {
                          for (let j = i + 1; j < teams.length; j++) {
                            matches.push({
                              id: crypto.randomUUID(),
                              homeTeamId: teams[i].id,
                              awayTeamId: teams[j].id,
                              date: tournament.date,
                              status: 'scheduled',
                              round: 1
                            });
                          }
                        }
                        onUpdate({ ...tournament, matches });
                      }}
                      className="mt-4 text-indigo-600 font-bold hover:underline"
                    >
                      Gerar Tabela Automática
                    </button>
                  )}
                </div>
              )}
              {tournament.matches.map(match => (
                <MatchRow 
                  key={match.id} 
                  match={match} 
                  teams={tournament.teams}
                  onUpdateScore={(h, a) => updateMatchScore(match.id, h, a)}
                />
              ))}
            </div>
          )}

          {activeSubTab === 'teams' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">{tournament.teams.length} Equipes Inscritas</h3>
                <button 
                  onClick={() => setIsAddingTeam(true)}
                  className="flex items-center gap-2 text-indigo-600 font-bold hover:bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                >
                  <Plus size={20} />
                  Adicionar Equipe
                </button>
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
                  <div key={team.id} className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-bold text-indigo-600 shadow-sm">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{team.name}</h4>
                        <p className="text-xs text-slate-500">{team.players.length} Jogadores</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onUpdate({ ...tournament, teams: tournament.teams.filter(t => t.id !== team.id) })}
                      className="text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
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
      </div>
    </div>
  );
}

function MatchRow({ match, teams, onUpdateScore }: { match: Match, teams: Team[], onUpdateScore: (h: number, a: number) => void, key?: React.Key }) {
  const homeTeam = teams.find(t => t.id === match.homeTeamId);
  const awayTeam = teams.find(t => t.id === match.awayTeamId);
  const [isEditing, setIsEditing] = useState(false);
  const [scores, setScores] = useState({ home: match.homeScore || 0, away: match.awayScore || 0 });

  if (!homeTeam || !awayTeam) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-sm transition-all">
      <div className="flex-1 flex items-center justify-end gap-4 w-full md:w-auto">
        <span className="font-bold text-slate-900 text-lg text-right">{homeTeam.name}</span>
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
            className="flex items-center gap-6 cursor-pointer group"
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
