import {
  getImportedBindingByIdentifier as readImportedBindingByIdentifier,
  getImportedBindingByPropertyAccess as readImportedBindingByPropertyAccess,
} from './import/bindingLookup';
import { getVariableAssignedFunctionSymbol as readVariableAssignedFunctionSymbol } from './import/functionSymbols';
import { collectImportBindings as readImportBindings } from './import/bindings';

export const getImportedBindingByIdentifier = readImportedBindingByIdentifier;
export const getImportedBindingByPropertyAccess = readImportedBindingByPropertyAccess;
export const getVariableAssignedFunctionSymbol = readVariableAssignedFunctionSymbol;
export const collectImportBindings = readImportBindings;
