'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  DEFAULT_PRINTER_SETTINGS,
  PrinterRuntimeState,
  PrinterSettings,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getBluetoothSupportInfo,
  getPrinterRuntimeState,
  getPrinterSettings,
  printTestThermalReceipt,
  printTransactionViaBluetooth,
  reconnectSavedPrinter,
  savePrinterSettings,
  subscribePrinterRuntime,
  subscribePrinterSettings,
} from './bluetoothPrinter';

const DEFAULT_RUNTIME: PrinterRuntimeState = {
  status: 'disconnected',
  deviceName: null,
  lastError: null,
  lastPrintedAt: null,
};

const DEFAULT_SUPPORT = { supported: true, isSecureContext: true } as {
  supported: boolean;
  isSecureContext: boolean;
  reason?: string;
};

let cachedSupport = DEFAULT_SUPPORT;
function getClientSupportSnapshot() {
  const next = getBluetoothSupportInfo();
  if (
    next.supported !== cachedSupport.supported ||
    next.isSecureContext !== cachedSupport.isSecureContext ||
    next.reason !== cachedSupport.reason
  ) {
    cachedSupport = next;
  }
  return cachedSupport;
}

const subscribeNoop = () => () => {};

let cachedSettingsSnapshot: PrinterSettings | null = null;
function getSettingsSnapshot(): PrinterSettings {
  const fresh = getPrinterSettings();
  if (
    !cachedSettingsSnapshot ||
    JSON.stringify(cachedSettingsSnapshot) !== JSON.stringify(fresh)
  ) {
    cachedSettingsSnapshot = fresh;
  }
  return cachedSettingsSnapshot;
}

export function useBluetoothPrinter() {
  const runtime = useSyncExternalStore(
    subscribePrinterRuntime,
    getPrinterRuntimeState,
    () => DEFAULT_RUNTIME
  );

  const settings = useSyncExternalStore(
    subscribePrinterSettings,
    getSettingsSnapshot,
    () => DEFAULT_PRINTER_SETTINGS
  );

  const supportInfo = useSyncExternalStore(
    subscribeNoop,
    getClientSupportSnapshot,
    () => DEFAULT_SUPPORT
  );

  useEffect(() => {
    void reconnectSavedPrinter();
  }, []);

  return {
    runtime,
    settings,
    supportInfo,
    isConnected: runtime.status === 'connected' || runtime.status === 'printing',
    isBusy: runtime.status === 'connecting' || runtime.status === 'printing',
    connect: connectBluetoothPrinter,
    disconnect: disconnectBluetoothPrinter,
    updateSettings: savePrinterSettings,
    testPrint: printTestThermalReceipt,
    printTransaction: printTransactionViaBluetooth,
  };
}
