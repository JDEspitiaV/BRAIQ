import { AuditLedgerEntry, RiskManagementOrder, OracleTick } from '../types';

const LEDGER_STORAGE_KEY = 'ai_broker_audit_ledger';
const ORDERS_STORAGE_KEY = 'ai_broker_risk_orders';

const generateChecksum = (data: string): string => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
};

export const getAuditLedger = (): AuditLedgerEntry[] => {
  try {
    const data = localStorage.getItem(LEDGER_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const recordAuditEntry = (
  eventType: AuditLedgerEntry['eventType'],
  symbol: string,
  payload: Record<string, any>
): AuditLedgerEntry => {
  const ledger = getAuditLedger();
  const timestamp = new Date().toISOString();
  const rawContent = `${timestamp}:${eventType}:${symbol}:${JSON.stringify(payload)}`;
  
  let counter = 0;
  const entry: AuditLedgerEntry = {
    id: `LOG-${Date.now()}-${(++counter).toString(36)}`,
    timestamp,
    eventType,
    symbol,
    data: payload,
    checksum: generateChecksum(rawContent),
  };

  ledger.unshift(entry);
  localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(ledger.slice(0, 500)));
  return entry;
};

export const getRiskOrders = (): RiskManagementOrder[] => {
  try {
    const data = localStorage.getItem(ORDERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const createRiskOrder = (
  symbol: string,
  entryPrice: number,
  stopLoss: number,
  takeProfit: number
): RiskManagementOrder => {
  const orders = getRiskOrders();
  const newOrder: RiskManagementOrder = {
    id: `ORD-${Date.now()}`,
    symbol: symbol.toUpperCase(),
    entryPrice,
    stopLoss,
    takeProfit,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));

  recordAuditEntry('RISK_ORDER_CREATED', newOrder.symbol, {
    orderId: newOrder.id,
    entryPrice,
    stopLoss,
    takeProfit,
  });

  return newOrder;
};

export const evaluateOraclesAgainstRisk = (tick: OracleTick): RiskManagementOrder[] => {
  const orders = getRiskOrders();
  let updated = false;

  const modifiedOrders = orders.map((order) => {
    if (order.symbol !== tick.symbol || order.status !== 'ACTIVE') return order;

    if (tick.price <= order.stopLoss) {
      order.status = 'STOP_LOSS_TRIGGERED';
      order.triggeredAt = tick.timestamp;
      order.triggeredPrice = tick.price;
      updated = true;

      recordAuditEntry('STOP_LOSS_EXECUTED', order.symbol, {
        orderId: order.id,
        triggerPrice: tick.price,
        targetStopLoss: order.stopLoss,
        oracleSource: tick.source,
      });
    } else if (tick.price >= order.takeProfit) {
      order.status = 'TAKE_PROFIT_TRIGGERED';
      order.triggeredAt = tick.timestamp;
      order.triggeredPrice = tick.price;
      updated = true;

      recordAuditEntry('TAKE_PROFIT_EXECUTED', order.symbol, {
        orderId: order.id,
        triggerPrice: tick.price,
        targetTakeProfit: order.takeProfit,
        oracleSource: tick.source,
      });
    }

    return order;
  });

  if (updated) {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(modifiedOrders));
  }

  return modifiedOrders;
};
