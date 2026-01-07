/**
 * 📊 ACTIVITY SUBSCRIBER - Pattern Observer con Retry Queue
 * =========================================================
 * 
 * Subscriber che ascolta eventi di dominio e registra attività.
 * Decoupling: I servizi non conoscono ActivityService direttamente.
 * 
 * Eventi supportati:
 * - worklog.created: quando viene creato un nuovo worklog
 * - worklog.updated: quando viene aggiornato un worklog
 * - goal.completed: quando un goal viene completato
 * - session.completed: quando una sessione di studio viene completata
 * 
 * Gestione errori:
 * - Retry automatico con exponential backoff (Bull queue)
 * - Fallback a chiamata diretta se Redis non disponibile
 * - Non blocca la risposta HTTP al client
 * - Metriche per monitoring
 */

const { addActivityJob } = require('../queues/activityQueue');
const eventBus = require('../utils/eventBus');

/**
 * Gestisce l'evento worklog.created
 */
async function handleWorkLogCreated(data) {
    const { userId, workLog } = data;
    
    if (!userId || !workLog) {
        console.error('❌ ActivitySubscriber: dati mancanti per worklog.created', { userId, workLog });
        return;
    }

    const durationMinutes = Number.isFinite(workLog.durationMinutes)
        ? workLog.durationMinutes
        : 0;
    
    const tags = Array.isArray(workLog.tags) ? workLog.tags : [];
    const timeOfDay = getTimeOfDayLabel(new Date());

    // Determina tipo di attività per analytics
    const activityType = (workLog.startTime && workLog.endTime) 
        ? 'WORK_SESSION_LOGGED' 
        : 'WORK_NOTE_CREATED';

    // Usa queue con retry automatico
    await addActivityJob(userId, activityType, {
        entityId: workLog._id || workLog.id,
        category: 'work',
        metadata: {
            entityId: workLog._id || workLog.id,
            projectId: workLog.projectId,
            durationMinutes,
            tags,
            timeOfDay,
            date: workLog.date,
            startTime: workLog.startTime || null,
            endTime: workLog.endTime || null,
            hasTimeTracking: !!(workLog.startTime && workLog.endTime),
        },
    });
}

/**
 * Gestisce l'evento worklog.updated
 */
async function handleWorkLogUpdated(data) {
    const { userId, workLog, previousWorkLog } = data;
    
    if (!userId || !workLog) {
        console.error('❌ ActivitySubscriber: dati mancanti per worklog.updated', { userId, workLog });
        return;
    }

    // Registra attività solo se ci sono cambiamenti significativi
    // (es. cambio durata, cambio progetto, ecc.)
    const durationChanged = previousWorkLog && 
        previousWorkLog.durationMinutes !== workLog.durationMinutes;
    const projectChanged = previousWorkLog && 
        previousWorkLog.projectId?.toString() !== workLog.projectId?.toString();

    if (!durationChanged && !projectChanged) {
        // Nessun cambiamento significativo, non registrare
        return;
    }

    const durationMinutes = Number.isFinite(workLog.durationMinutes)
        ? workLog.durationMinutes
        : 0;
    
    const tags = Array.isArray(workLog.tags) ? workLog.tags : [];
    const timeOfDay = getTimeOfDayLabel(new Date());

    await addActivityJob(userId, 'WORK_SESSION_UPDATED', {
        entityId: workLog._id || workLog.id,
        category: 'work',
        metadata: {
            entityId: workLog._id || workLog.id,
            projectId: workLog.projectId,
            durationMinutes,
            tags,
            timeOfDay,
            date: workLog.date,
            startTime: workLog.startTime || null,
            endTime: workLog.endTime || null,
            hasTimeTracking: !!(workLog.startTime && workLog.endTime),
            changes: {
                durationChanged,
                projectChanged,
            },
        },
    });
}

/**
 * Gestisce l'evento goal.completed
 */
async function handleGoalCompleted(data) {
    const { userId, goal } = data;
    
    if (!userId || !goal) {
        console.error('❌ ActivitySubscriber: dati mancanti per goal.completed', { userId, goal });
        return;
    }

    const timeOfDay = getTimeOfDayLabel(new Date());
    const createdAt = goal.createdAt ? new Date(goal.createdAt) : new Date();
    const completedAt = goal.updatedAt ? new Date(goal.updatedAt) : new Date();
    const daysToComplete = Math.ceil((completedAt - createdAt) / (1000 * 60 * 60 * 24));

    await addActivityJob(userId, 'GOAL_COMPLETED', {
        entityId: goal._id || goal.id,
        category: goal.category || 'general',
        metadata: {
            entityId: goal._id || goal.id,
            category: goal.category,
            priority: goal.priority,
            daysToComplete,
            deadline: goal.deadline || null,
            timeOfDay,
        },
    });
}

/**
 * Gestisce l'evento session.completed
 */
async function handleSessionCompleted(data) {
    const { userId, session } = data;
    
    if (!userId || !session) {
        console.error('❌ ActivitySubscriber: dati mancanti per session.completed', { userId, session });
        return;
    }

    const timeOfDay = getTimeOfDayLabel(new Date());

    await addActivityJob(userId, 'SESSION_COMPLETE', {
        entityId: session.deckId || session.entityId,
        category: 'study',
        metadata: {
            ...session,
            timeOfDay,
        },
    });
}

/**
 * Helper: determina etichetta time of day (morning, afternoon, evening, night)
 */
function getTimeOfDayLabel(date) {
    const hour = date.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
}

/**
 * Inizializza i subscriber
 * Chiama questa funzione all'avvio dell'applicazione
 */
function initializeSubscribers() {
    // Registra listener per tutti gli eventi
    eventBus.on('worklog.created', handleWorkLogCreated);
    eventBus.on('worklog.updated', handleWorkLogUpdated);
    eventBus.on('goal.completed', handleGoalCompleted);
    eventBus.on('session.completed', handleSessionCompleted);
    
    console.log('✅ ActivitySubscriber inizializzato (worklog, goal, session)');
}

module.exports = {
    initializeSubscribers,
    handleWorkLogCreated, // Esportato per test
    handleWorkLogUpdated,
    handleGoalCompleted,
    handleSessionCompleted,
};
