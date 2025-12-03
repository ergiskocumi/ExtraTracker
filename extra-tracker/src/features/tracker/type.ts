export interface WorkLog{

    id: string; // identificativo unico per il mongodb
    projectId: string; // identificativo del progetto associato
    date: string; // data del lavoro svolto
    startTime: string; // orario di inizio del lavoro
    endTime: string; // orario di fine del lavoro
    description?: string; // descrizione del lavoro svolto
}