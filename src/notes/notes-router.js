const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json() 

const sanitizeNote = note => ({
    id: note.id,
    note_name: xss(note.note_name),
    content: xss(note.content),
    modified: note.modified,
    folder: note.folder
})

notesRouter
    .route('/notes')
    .get((req, res, next) => {
        NotesService.getAllNotes(
            req.app.get('db')
        )
        .then(notes => {
            res.json(notes.map(sanitizeNote))
        })
        .catch(next)
    })

notesRouter
    .route('/notes/addNote')
    .post(jsonParser, (req, res, next) => {
        const { note_name, content, modified, folder } = req.body
        const newNote = { note_name, modified, folder }

        for (const [key, value] of Object.entries(newNote)) {
            if (value == null) {
                return res.status(400).json({
                    error: { message: `Missing '${key}' in request body` }
                })
            }
        }
        newNote.content = content
        NotesService.insertNote(
            req.app.get('db'),
            newNote
        )
            .then(note => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${note.id}`))
                    .json(sanitizeNote(note))
            })
            .catch(next)
    })

notesRouter
    .route('/notes/:note_id')
    .all((req, res, next) => {
        NotesService.getById(
            req.app.get('db'),
            req.params.note_id
        )
            .then(note => {
                if (!note) {
                    return res.status(404).json({
                        error: { message: `Note doesn't exist` }
                    })
                }
                res.note = note
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(sanitizeNote(res.note))
    })
    .delete((req, res, next) => {
        NotesService.deleteNote(
            req.app.get('db'),
            req.params.note_id
        )
        .then(() => {
            res.status(204).end()
        })
        .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { id, note_name, content, modified, folder } = req.body
        // const modified = new Date();
        // console.log(req.body)
        const noteToUpdate = { id, note_name, content, modified, folder }

        const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
        if (numberOfValues === 0) {
            return res.status(400).json({
                error: {
                    message: `Request body must contain either 'Note Name', 'Content', 'Modified Date', or 'Folder'`
                }
            })
        }

        NotesService.updateNote(
            req.app.get('db'),
            req.params.note_id,
            noteToUpdate
        )
            .then(numRowsAffected => {
                console.log(numRowsAffected)
                res.status(204).end()
            })
            .catch(next)
    })

    module.exports = notesRouter