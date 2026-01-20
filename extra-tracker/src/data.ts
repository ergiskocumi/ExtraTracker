/*
Questo file serve per fornire dati MOCK per i log di lavoro.
Simula un database con dati predefiniti per facilitare lo sviluppo e i test dell'applicazione.
*/

import type { WorkLog } from "./features/tracker/type";

//import delle ore di straordinario che avrei fatto con dati MOCK
export const MOCK_WORKLOGS: WorkLog[] = [
    {
        id: "1",
        projectId: "c1",
        date: "2023-10-01",
        title: "Sessione mattutina",
        startTime: "09:00",
        endTime: "11:00",
        description: "Lavoro sul progetto A",
        createdAt: "2023-10-01T11:00:00.000Z",
        updatedAt: "2023-10-01T11:00:00.000Z"
    },
    {
        id: "2",
        projectId: "c2",
        date: "2023-10-01",
        title: "Migrazione cloud",
        startTime: "11:30",
        endTime: "13:30",
        description: "Lavoro sul progetto B",
        createdAt: "2023-10-01T13:30:00.000Z",
        updatedAt: "2023-10-01T13:30:00.000Z"
    },
     {
        id: "3",
        projectId: "c3",
        date: "2023-10-01",
        title: "Script AD",
        startTime: "11:30",
        endTime: "13:30",
        description: "Script AD per Martesana",
        createdAt: "2023-10-01T13:30:00.000Z",
        updatedAt: "2023-10-01T13:30:00.000Z"
    }
];
