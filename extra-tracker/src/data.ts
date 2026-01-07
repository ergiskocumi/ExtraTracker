/*
Questo file seve per fornire dati MOCK per i progetti e i log di lavoro.
Simula un database con dati predefiniti per facilitare lo sviluppo e i test dell'applicazione.
*/

import type { Project } from "./features/projects/type";
import type { WorkLog } from "./features/tracker/type";

// import dei clienti per cui avrei lavorato con dati MOCK
export const MOCK_PROJECTS: Project[] = [
    {
        id: "c1",
        name: "Cliente A",
        code: "COM001",
        description: "Implementazione piattaforma web",
        rate: 25,
    },
    {
        id: "c2",
        name: "Cliente B",
        code: "COM002",
        description: "Migrazione infrastruttura cloud",
        rate: 25,
    },
    {
        id: "c3",
        name: "Martesana",
        code: "3474",
        description: "Supporto sistemistico continuativo",
        rate: 25,
    }
]

//import delle ore di straordinario che avrei fatto con dati MOCK
export const MOCK_WORKLOGS: WorkLog[] = [
    {
        id: "1",
        projectId: "c1",
        date: "2023-10-01",
        startTime: "09:00",
        endTime: "11:00",
        description: "Lavoro sul progetto A"
    },
    {
        id: "2",
        projectId: "c2",
        date: "2023-10-01",
        startTime: "11:30",
        endTime: "13:30",
        description: "Lavoro sul progetto B"
    },
     {
        id: "3",
        projectId: "c3",
        date: "2023-10-01",
        startTime: "11:30",
        endTime: "13:30",
        description: "Script AD per Martesana"
    }
];
