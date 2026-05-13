import { CONSULTANT_MAPPING } from '../constants.ts';

export interface ProcessedCall {
  id: string;
  timestamp: string;
  duration: number;
  consultantName: string;
  team: string;
  extension: string;
  type: 'Ativa' | 'Receptiva';
  status: 'Atendida' | 'Perdida';
}

export function processRawCall(call: any): ProcessedCall | null {
  try {
    const uniqueId = String(call.uniqueid || call.id || call.Uniqueid || call.linkedid || '');
    if (!uniqueId) return null;

    const rawOrigin = String(call.origin || call.src || call.source || call.origem || '');
    const rawDestiny = String(call.destiny || call.dst || call.destination || call.destino || '');
    const rawAgent = String(call.agent_id || call.agent || call.ramal_id || call.extension_id || '');

    const getExtension = (val: string) => {
      if (!val) return '';
      const match = val.match(/\((\d+)\)/); 
      if (match) return match[1];
      const digitMatch = val.match(/(\d{3,5})/);
      if (digitMatch) return digitMatch[1];
      const cleaned = val.replace(/[^\d]/g, '').trim();
      return (cleaned.length >= 3 && cleaned.length <= 5) ? cleaned : '';
    };

    const originExt = getExtension(rawOrigin);
    const destinyExt = getExtension(rawDestiny);
    const agentExt = getExtension(rawAgent);
    
    const mappingOrig = CONSULTANT_MAPPING[originExt];
    const mappingDest = CONSULTANT_MAPPING[destinyExt];
    const mappingAgent = CONSULTANT_MAPPING[agentExt];
    
    const typeRaw = String(call.type || call.direction || call.tipo || call.direcao || '').toLowerCase();
    
    let consultantName = null;
    let team = null;
    let ext = '';
    let foundIn: 'origin' | 'destiny' | 'agent' | null = null;

    if (mappingAgent) {
      consultantName = mappingAgent.name;
      team = mappingAgent.team;
      ext = agentExt;
      foundIn = 'agent';
    } else if (mappingOrig) {
      consultantName = mappingOrig.name;
      team = mappingOrig.team;
      ext = originExt;
      foundIn = 'origin';
    } else if (mappingDest) {
      consultantName = mappingDest.name;
      team = mappingDest.team;
      ext = destinyExt;
      foundIn = 'destiny';
    } 

    if (!consultantName) return null; 

    let type: 'Ativa' | 'Receptiva' = 'Ativa';
    
    if (typeRaw.includes('sainte') || typeRaw.includes('outbound') || typeRaw.includes('ativa')) {
      type = 'Ativa';
    } else if (typeRaw.includes('entrante') || typeRaw.includes('inbound') || typeRaw.includes('recep')) {
      type = 'Receptiva';
    } else if (foundIn) {
      type = (foundIn === 'origin' || foundIn === 'agent') ? 'Ativa' : 'Receptiva';
    }

    const disposition = String(call.disposition || call.status || call.situacao || call.state || '').toUpperCase();
    const billablesec = Number(call.billablesec || call.duration || call.tempo_fala || call.Bilhetagem || call.seconds || 0);
    
    // Applying the 20s rule for effectiveness as requested previously
    const isAttended = (disposition.includes('ANSWER') || 
                       disposition.includes('ATEND') || 
                       disposition.includes('SUCCESS') || 
                       disposition.includes('COMPLET') || 
                       billablesec > 0) && billablesec >= 20;

    const status = isAttended ? 'Atendida' : 'Perdida';

    const dateVal = call.startDate || call.date || call.timestamp || call.created_at || call.Data || Date.now();
    const timestamp = new Date(dateVal).toISOString();

    return {
      id: uniqueId,
      timestamp,
      status,
      duration: billablesec,
      consultantName,
      team: team as string,
      extension: ext,
      type
    };
  } catch (e) {
    console.warn("Failed to process call:", call, e);
    return null;
  }
}
