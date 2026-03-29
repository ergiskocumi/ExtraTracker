/**
 * 🎓 EXAM CRUD SERVICE
 * ====================
 * Business logic per CRUD esami.
 * Separato da examController (che gestisce PDF/solver/recovery).
 */

const examRepository = require('../repositories/ExamRepository');
const Deck = require('../models/Deck');
const AppError = require('../utils/AppError');
const { serializeDocument, serializeDocuments } = require('../utils/serializeDocument');

class ExamCrudService {
    /**
     * Ottieni tutti gli esami dell'utente.
     */
    async getAll(tenantScope) {
        const exams = await examRepository.find(tenantScope, {}, {
            sort: { createdAt: -1 },
        });
        return serializeDocuments(exams);
    }

    /**
     * Ottieni un esame per ID.
     */
    async getById(tenantScope, id) {
        const exam = await examRepository.findById(tenantScope, id, { throwIfNotFound: true });
        return serializeDocument(exam);
    }

    /**
     * Crea un nuovo esame.
     */
    async create(tenantScope, data) {
        const { title, description, deadline, status, outcome } = data;

        if (!title || !String(title).trim()) {
            throw AppError.validation('Il titolo è obbligatorio');
        }
        if (!deadline) {
            throw AppError.validation('La data dell\'esame è obbligatoria');
        }

        const exam = await examRepository.create(tenantScope, {
            title: String(title).trim(),
            description: typeof description === 'string' ? description.trim() : '',
            deadline: new Date(deadline),
            status: status || 'active',
            outcome: outcome || null,
        });

        return serializeDocument(exam);
    }

    /**
     * Aggiorna un esame esistente.
     */
    async update(tenantScope, id, data) {
        const { title, description, deadline, status, outcome } = data;

        const exam = await examRepository.findById(tenantScope, id, { throwIfNotFound: true });

        if (title !== undefined) {
            if (!String(title).trim()) {
                throw AppError.validation('Il titolo non può essere vuoto');
            }
            exam.title = String(title).trim();
        }
        if (description !== undefined) {
            exam.description = typeof description === 'string' ? description.trim() : '';
        }
        if (deadline !== undefined) exam.deadline = new Date(deadline);
        if (status !== undefined) exam.status = status;
        if (outcome !== undefined) exam.outcome = outcome;

        await exam.save();
        return serializeDocument(exam);
    }

    /**
     * Elimina un esame e scollega i deck associati.
     */
    async delete(tenantScope, id) {
        const userId = tenantScope.userId || tenantScope.tenantId;

        await examRepository.findById(tenantScope, id, { throwIfNotFound: true });

        // Scollega i deck dall'esame
        await Deck.updateMany(
            { user: userId, examId: id },
            { $unset: { examId: 1 } }
        );

        await examRepository.delete(tenantScope, id);
        return { message: 'Esame eliminato' };
    }
}

module.exports = new ExamCrudService();
