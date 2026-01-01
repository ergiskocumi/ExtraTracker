import type { Project } from "../projects/type";
import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FiEdit2, FiFolder, FiCalendar, FiPlay, FiSquare, FiPlus, FiFileText, 
    FiClock, FiZap, FiX, FiChevronDown, FiSun, FiSunset, FiMoon
} from "react-icons/fi";
import type { WorkLog, WorkLogFormMode } from "./type";
import DatePicker, { registerLocale } from "react-datepicker";
import { it } from "date-fns/locale/it";
import "react-datepicker/dist/react-datepicker.css";
import { generateTimeSlots } from "../../shared/utils/dateUtils";
import { TimeSelect } from "../../shared/components/TimeSelect";

// Registra la lingua italiana
registerLocale("it", it);

interface WorkLogFormProps {
    projects: Project[];
    onSave: (data: { projectId: string; date: string; startTime: string; endTime: string }) => void;
    initialData: WorkLog | null;
    mode: WorkLogFormMode;
    onCancel: () => void;
}

// Preset orari intelligenti
const TIME_PRESETS = [
    { label: 'Mattina', icon: FiSun, start: '09:00', end: '13:00', hours: 4, color: 'amber' },
    { label: 'Pomeriggio', icon: FiSunset, start: '14:00', end: '18:00', hours: 4, color: 'orange' },
    { label: 'Full Day', icon: FiClock, start: '09:00', end: '18:00', hours: 8, color: 'purple' },
    { label: 'Sera', icon: FiMoon, start: '19:00', end: '22:00', hours: 3, color: 'indigo' },
];

// Quick Duration buttons
const QUICK_DURATIONS = [
    { label: '1h', hours: 1 },
    { label: '2h', hours: 2 },
    { label: '4h', hours: 4 },
    { label: '8h', hours: 8 },
];

export const WorkLogForm = ({ projects, onSave, initialData, mode, onCancel }: WorkLogFormProps) => {
    const TIME_SLOTS = generateTimeSlots();

    const [formData, setFormData] = useState({
        projectId: initialData?.projectId || "",
        date: initialData?.date || "",
        startTime: initialData?.startTime || "",
        endTime: initialData?.endTime || "",
    });

    const [selectedDate, setSelectedDate] = useState<Date | null>(
        initialData?.date ? new Date(initialData.date) : null
    );
    
    const [showProjectDropdown, setShowProjectDropdown] = useState(false);
    const [showQuickTimes, setShowQuickTimes] = useState(true);

    // Allinea il form quando cambia il dato in ingresso
    useEffect(() => {
        setFormData({
            projectId: initialData?.projectId || "",
            date: initialData?.date || "",
            startTime: initialData?.startTime || "",
            endTime: initialData?.endTime || "",
        });
        setSelectedDate(initialData?.date ? new Date(initialData.date) : null);
    }, [initialData, mode]);

    // Calcola durata e guadagno stimato
    const calculations = useMemo(() => {
        if (!formData.startTime || !formData.endTime) return null;
        
        const start = new Date(`2000-01-01T${formData.startTime}`);
        const end = new Date(`2000-01-01T${formData.endTime}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        
        if (hours <= 0) return null;
        
        const project = projects.find(p => p.id === formData.projectId);
        const earnings = project ? hours * project.rate : 0;
        
        return { hours, earnings, project };
    }, [formData.startTime, formData.endTime, formData.projectId, projects]);

    const selectedProject = projects.find(p => p.id === formData.projectId);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({ ...prevData, [name]: value }));
    };

    const handleDateChange = (date: Date | null) => {
        setSelectedDate(date);
        if (date) {
            const formattedDate = date.toISOString().split('T')[0];
            setFormData((prevData) => ({ ...prevData, date: formattedDate }));
        }
    };

    // Apply time preset
    const applyTimePreset = (preset: typeof TIME_PRESETS[0]) => {
        setFormData(prev => ({
            ...prev,
            startTime: preset.start,
            endTime: preset.end
        }));
        setShowQuickTimes(false);
    };

    // Apply quick duration from start time
    const applyQuickDuration = (hours: number) => {
        if (!formData.startTime) return;
        
        const start = new Date(`2000-01-01T${formData.startTime}`);
        start.setHours(start.getHours() + hours);
        const endTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        
        setFormData(prev => ({ ...prev, endTime }));
    };

    // Set today's date quickly
    const setToday = () => {
        const today = new Date();
        setSelectedDate(today);
        setFormData(prev => ({ ...prev, date: today.toISOString().split('T')[0] }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        
        if (!initialData || mode === "smartCopy") {
            setFormData({ projectId: '', date: '', startTime: '', endTime: '' });
            setSelectedDate(null);
            setShowQuickTimes(true);
        }
    };

    const isEditing = mode === "edit";
    const isDuplicating = mode === "smartCopy";

    // Get mode styles
    const getModeStyles = () => {
        if (isEditing) return {
            border: 'border-amber-500/30',
            bg: 'bg-amber-500/5',
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-400',
            btnClass: 'bg-amber-500 hover:bg-amber-400'
        };
        if (isDuplicating) return {
            border: 'border-blue-500/30',
            bg: 'bg-blue-500/5',
            iconBg: 'bg-blue-500/20',
            iconColor: 'text-blue-400',
            btnClass: 'bg-blue-500 hover:bg-blue-400'
        };
        return {
            border: 'border-primary-500/30',
            bg: 'bg-primary-500/5',
            iconBg: 'bg-primary-500/20',
            iconColor: 'text-primary-400',
            btnClass: 'bg-primary-500 hover:bg-primary-400'
        };
    };
    
    const styles = getModeStyles();

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${styles.border} ${styles.bg} overflow-hidden`}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center`}>
                        {isEditing && <FiEdit2 className={styles.iconColor} size={20} />}
                        {isDuplicating && <FiFileText className="text-blue-400" size={20} />}
                        {!isEditing && !isDuplicating && <FiPlus className="text-primary-400" size={20} />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">
                            {isEditing ? 'Modifica Attività' : isDuplicating ? 'Smart Copy' : 'Nuovo Log'}
                        </h3>
                        <p className="text-xs text-white/50">
                            {isEditing 
                                ? 'Modifica i dettagli del log' 
                                : isDuplicating 
                                    ? 'Copia e salva come nuovo' 
                                    : 'Registra le tue ore di lavoro'}
                        </p>
                    </div>
                </div>
                
                {(isEditing || isDuplicating) && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                    >
                        <FiX className="text-white/50 hover:text-white" size={20} />
                    </button>
                )}
            </div>

            {/* Smart Copy Notice */}
            {isDuplicating && (
                <div className="px-5 py-3 bg-blue-500/10 border-b border-blue-500/20">
                    <p className="flex items-center gap-2 text-sm text-blue-300">
                        <FiZap size={16} />
                        Controlla data e orari prima di salvare
                    </p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-5">
                {/* Quick Time Presets */}
                <AnimatePresence>
                    {showQuickTimes && !isEditing && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-5"
                        >
                            <p className="flex items-center gap-2 mb-3 text-xs font-medium text-white/60">
                                <FiZap size={12} />
                                Orari rapidi
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                                {TIME_PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() => applyTimePreset(preset)}
                                        className={`p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all text-center group`}
                                    >
                                        <preset.icon className={`mx-auto mb-1 text-${preset.color}-400`} size={18} />
                                        <p className="text-xs font-medium text-white">{preset.label}</p>
                                        <p className="text-[10px] text-white/40">{preset.hours}h</p>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                    {/* Project Selector */}
                    <div className="lg:col-span-1">
                        <label className="block mb-2 text-xs font-medium text-white/60">
                            <FiFolder className="inline mr-1" size={12} />
                            Progetto
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-colors text-left"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {selectedProject ? (
                                        <>
                                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-white">
                                                    {selectedProject.name.charAt(0)}
                                                </span>
                                            </div>
                                            <span className="text-sm text-white truncate">{selectedProject.name}</span>
                                        </>
                                    ) : (
                                        <span className="text-sm text-white/40">Seleziona...</span>
                                    )}
                                </div>
                                <FiChevronDown className={`text-white/40 transition-transform flex-shrink-0 ${showProjectDropdown ? 'rotate-180' : ''}`} size={16} />
                            </button>
                            
                            <AnimatePresence>
                                {showProjectDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute z-20 w-full mt-2 py-2 rounded-xl bg-dark-700 border border-white/[0.1] shadow-xl max-h-60 overflow-y-auto"
                                    >
                                        {projects.map(project => (
                                            <button
                                                key={project.id}
                                                type="button"
                                                onClick={() => {
                                                    handleChange({ target: { name: 'projectId', value: project.id } } as React.ChangeEvent<HTMLInputElement>);
                                                    setShowProjectDropdown(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                                                    <span className="text-xs font-bold text-white">
                                                        {project.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{project.name}</p>
                                                    <p className="text-xs text-white/50">€{project.rate}/h</p>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        {/* Hidden select for form validation */}
                        <select
                            name="projectId"
                            required
                            value={formData.projectId}
                            onChange={handleChange}
                            className="sr-only"
                        >
                            <option value="">--</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    {/* Date Picker */}
                    <div>
                        <label className="block mb-2 text-xs font-medium text-white/60">
                            <FiCalendar className="inline mr-1" size={12} />
                            Data
                        </label>
                        <div className="relative">
                            <DatePicker
                                selected={selectedDate}
                                onChange={handleDateChange}
                                dateFormat="dd/MM/yyyy"
                                locale="it"
                                placeholderText="Seleziona data"
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white placeholder-white/40 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                                calendarClassName="dark-calendar"
                                showPopperArrow={false}
                                popperPlacement="bottom-start"
                                portalId="datepicker-portal"
                                required
                            />
                            {!selectedDate && (
                                <button
                                    type="button"
                                    onClick={setToday}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded-md bg-primary-500/20 text-primary-400 hover:bg-primary-500/30 transition-colors"
                                >
                                    Oggi
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Start Time */}
                    <div>
                        <label className="block mb-2 text-xs font-medium text-white/60">
                            <FiPlay className="inline mr-1" size={12} />
                            Inizio
                        </label>
                        <TimeSelect
                            value={formData.startTime}
                            onChange={(value) => setFormData((prev) => ({ ...prev, startTime: value }))}
                            options={TIME_SLOTS}
                            placeholder="-- : --"
                            required
                        />
                    </div>

                    {/* End Time */}
                    <div>
                        <label className="block mb-2 text-xs font-medium text-white/60">
                            <FiSquare className="inline mr-1" size={12} />
                            Fine
                        </label>
                        <TimeSelect
                            value={formData.endTime}
                            onChange={(value) => setFormData((prev) => ({ ...prev, endTime: value }))}
                            options={TIME_SLOTS}
                            placeholder="-- : --"
                            required
                        />
                        {/* Quick Duration Buttons */}
                        {formData.startTime && !formData.endTime && (
                            <div className="flex gap-1 mt-2">
                                {QUICK_DURATIONS.map(d => (
                                    <button
                                        key={d.label}
                                        type="button"
                                        onClick={() => applyQuickDuration(d.hours)}
                                        className="flex-1 py-1 text-xs rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-white/60 transition-colors"
                                    >
                                        +{d.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-end">
                        <button
                            type="submit"
                            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl ${styles.btnClass} text-white font-medium transition-all`}
                        >
                            {isEditing && <FiEdit2 size={16} />}
                            {isDuplicating && <FiFileText size={16} />}
                            {!isEditing && !isDuplicating && <FiPlus size={16} />}
                            <span>
                                {isEditing ? 'Salva' : isDuplicating ? 'Crea Copia' : 'Aggiungi'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Live Calculation Preview */}
                <AnimatePresence>
                    {calculations && calculations.hours > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="mt-4 p-4 rounded-xl bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-500/20"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div>
                                        <p className="text-xs text-white/50">Durata</p>
                                        <p className="text-lg font-bold text-white">{calculations.hours.toFixed(1)}h</p>
                                    </div>
                                    {calculations.project && (
                                        <div className="pl-4 border-l border-white/[0.1]">
                                            <p className="text-xs text-white/50">Guadagno stimato</p>
                                            <p className="text-lg font-bold text-emerald-400">€{calculations.earnings.toFixed(2)}</p>
                                        </div>
                                    )}
                                </div>
                                {calculations.project && (
                                    <div className="text-right">
                                        <p className="text-xs text-white/50">Tariffa</p>
                                        <p className="text-sm text-white/70">€{calculations.project.rate}/h</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>
        </motion.div>
    );
};
