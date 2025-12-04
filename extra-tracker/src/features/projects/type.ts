export interface Project {
    id: string;     //indetificativo unico per il mongodb 
    name: string;   // nome del cliente
    code: string;  // codice commessa del cliente
    description: string; // descrizione del progetto
    rate: number; // tariffa oraria per il progetto
}
