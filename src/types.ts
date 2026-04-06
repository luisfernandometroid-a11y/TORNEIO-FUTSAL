export type TournamentStatus = 'draft' | 'ongoing' | 'completed';

export interface Player {
  id: string;
  name: string;
  number?: number;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  color?: string;
  players: Player[];
  groupId?: string;
}

export interface Card {
  id: string;
  type: 'yellow' | 'red';
  playerName: string;
  teamId: string;
  matchId?: string;
  minute?: number;
  reason?: string;
  date: string;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  time?: string;
  place?: string;
  status: 'scheduled' | 'finished';
  round: number;
  group?: string;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  status: TournamentStatus;
  teams: Team[];
  matches: Match[];
  cards?: Card[];
  format: 'league' | 'knockout' | 'group_knockout';
  config?: {
    perGroup: number;
    qualify: number;
    tiebreak: 'gd' | 'gf';
    yellowSusp: number;
  };
}

export interface TeamStats {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}
