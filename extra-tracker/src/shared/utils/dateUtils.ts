export const timeToMinutes = (time: string): number => {
    // 1. Validazione Formato (HH:MM)
    // Regex rigorosa: 
    // ^       = inizio stringa
    // \d{2}   = esattamente due cifre
    // :       = due punti
    // \d{2}   = esattamente due cifre
    // $       = fine stringa
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!timeRegex.test(time)) {
        throw new Error("Formato non valido. Usa HH:MM (es. 09:30)");
    }

    const [hoursStr, minutesStr] = time.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    // 2. Validazione Logica (Ore 0-23, Minuti 0-59)
    if (hours < 0 || hours > 23) {
        throw new Error("Le ore devono essere tra 00 e 23");
    }
    if (minutes < 0 || minutes > 59) {
        throw new Error("I minuti devono essere tra 00 e 59");
    }

    return hours * 60 + minutes;

    //TODO: aggiungere un trim per rimuovere spazi bianchi all'inizio e alla fine della stringa e pulire l'output in maniera che 
    // anche se l'utente inserisce spazi bianchi non dia errore ma lo faccia proseguire normalmente
}


//funzione da usare poi nel calcolo delle ore lavorate 
export const calculateDurationInHours = (startTime: string, endTime: string): number => {
    const startTotalMinutes = timeToMinutes(startTime);
    let endTotalMinutes = timeToMinutes(endTime); // Uso 'let' perché potrei doverlo modificare

    // GESTIONE MIDNIGHT CROSSING
    // Se la fine è minore dell'inizio (es. 01:00 < 23:00), 
    // assumiamo che sia il giorno successivo.
    // Aggiungiamo 24 ore (24 * 60 = 1440 minuti) al totale della fine.
    if (endTotalMinutes < startTotalMinutes) {
        endTotalMinutes += 1440; 
    }

    const diffMinutes = endTotalMinutes - startTotalMinutes;

    // Arrotondiamo a 2 decimali per pulizia (opzionale ma consigliato)
    // es. 2.666666 -> 2.67
    return Number((diffMinutes / 60).toFixed(2));
}

//funzione per andare a scaglioni di 30 minuti nella selezione dell'orario
export const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for(let i=0;i<24;i++) {
        const hour = i.toString().padStart(2,'0');
        slots.push(`${hour}:00`);
        slots.push(`${hour}:30`);
    }
    return slots;
};