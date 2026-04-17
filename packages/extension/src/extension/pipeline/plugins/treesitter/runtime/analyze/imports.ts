import {
  getImportedBindingByIdentifier as readImportedBindingByIdentifier,
  getImportedBindingByPropertyAccess as readImportedBindingByPropertyAccess,
} from './import/binding/bindingLookup';
import { getVariableAssignedFunctionSymbol as readVariableAssignedFunctionSymbol } from './import/binding/functionSymbols';
import { collectImportBindings as readImportBindings } from './import/binding/bindings';

export const getImportedBindingByIdentifier = readImportedBindingByIdentifier;
export const getImportedBindingByPropertyAccess = readImportedBindingByPropertyAccess;
export const getVariableAssignedFunctionSymbol = readVariableAssignedFunctionSymbol;
export const collectImportBindings = readImportBindings;
