const timeToMinutes = (time: string): number => {
    const [hoursStr, minutesStr] = time.split(':'); //divido la stringa in ore e minuti
    
    //dichiaro le variabili e le converto in numeri da stringhe
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);

    return hours * 60 + minutes; //converto tutto in minuti
}

//funzione da usare poi nel calcolo delle ore lavorate 
export const calculateDurationInHours = (startTime: string, endTime: string): number => {
    const startTotalMinutes = timeToMinutes(startTime); //ottengo i minuti totali dall'inizio
    const endTotalMinutes = timeToMinutes(endTime); //ottengo i minuti totali dalla fine

    const diffMinutes = endTotalMinutes - startTotalMinutes; //calcolo la differenza in minuti

    return diffMinutes / 60; //converto i minuti in ore
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