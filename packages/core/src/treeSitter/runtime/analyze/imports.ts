import {
  getImportedBindingByIdentifier as readImportedBindingByIdentifier,
  getImportedBindingByPropertyAccess as readImportedBindingByPropertyAccess,
} from '../analyzeImportBinding/lookup';
import { getVariableAssignedFunctionSymbol as readVariableAssignedFunctionSymbol } from '../analyzeImportBinding/functionSymbols';
import { collectImportBindings as readImportBindings } from '../analyzeImportBinding/bindings';

export const getImportedBindingByIdentifier = readImportedBindingByIdentifier;
export const getImportedBindingByPropertyAccess = readImportedBindingByPropertyAccess;
export const getVariableAssignedFunctionSymbol = readVariableAssignedFunctionSymbol;
export const collectImportBindings = readImportBindings;
