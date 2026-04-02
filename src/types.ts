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
  players: Player[];
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
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
  format: 'league' | 'knockout' | 'group_knockout';
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
