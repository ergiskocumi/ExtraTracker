/**
 * 🎫 TICKET TEMPLATE
 * ==================
 * 
 * Template per ticket/issue tracking.
 * Campi: ticketId, ticketUrl, priority, resolution
 */

import { FiTag, FiLink, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import type { TicketTemplateData } from '../../types';

interface TicketTemplateProps {
    data: Record<string, unknown>;
    onChange: (data: Record<string, unknown>) => void;
}

export const TicketTemplate = ({ data, onChange }: TicketTemplateProps) => {
    const templateData = data as TicketTemplateData;
    
    const [ticketId, setTicketId] = useState(templateData?.ticketId || '');
    const [ticketUrl, setTicketUrl] = useState(templateData?.ticketUrl || '');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>(
        templateData?.priority || 'medium'
    );
    const [resolution, setResolution] = useState<'fixed' | 'wont-fix' | 'duplicate' | 'invalid' | ''>(
        templateData?.resolution || ''
    );

    useEffect(() => {
        onChange({
            ticketId: ticketId || undefined,
            ticketUrl: ticketUrl || undefined,
            priority: priority || undefined,
            resolution: resolution || undefined,
        });
    }, [ticketId, ticketUrl, priority, resolution, onChange]);

    const priorityColors = {
        low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
        critical: 'bg-red-500/20 text-red-300 border-red-500/30',
    };

    return (
        <div className="space-y-4 p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
                <FiTag size={18} className="text-primary-400" />
                <h4 className="text-sm font-semibold text-white">Ticket Details</h4>
            </div>

            {/* TICKET ID */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiTag size={14} />
                    Ticket ID
                </label>
                <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="Es. JIRA-123"
                />
            </div>

            {/* TICKET URL */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiLink size={14} />
                    Ticket URL
                </label>
                <input
                    type="url"
                    value={ticketUrl}
                    onChange={(e) => setTicketUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="https://jira.example.com/JIRA-123"
                />
            </div>

            {/* PRIORITY */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiAlertCircle size={14} />
                    Priorità
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setPriority(p)}
                            className={`
                                px-3 py-2 rounded-lg border-2 text-xs font-medium transition-all
                                ${priority === p
                                    ? `${priorityColors[p]} scale-105`
                                    : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20'
                                }
                            `}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* RESOLUTION */}
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white/80 mb-2">
                    <FiCheck size={14} />
                    Risoluzione (opzionale)
                </label>
                <select
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value as typeof resolution)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                    <option value="">Nessuna</option>
                    <option value="fixed">Fixed</option>
                    <option value="wont-fix">Won't Fix</option>
                    <option value="duplicate">Duplicate</option>
                    <option value="invalid">Invalid</option>
                </select>
            </div>
        </div>
    );
};
