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