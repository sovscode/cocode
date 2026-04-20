import { Answer } from './types';
import { State } from './statemachine';

export type ViewProviderState = State & { suggestionsVisible: boolean }