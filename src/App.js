import React, { useState, useEffect } from 'react';
import './App.css';
import { API, Storage } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';

const initialFormState = { name: '', description: '' }

const App = () => {
    const [notes, setNotes] = useState([]);
    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchNotes();
    }, []);

    /**
     * ノートを取得
     * @return {Promise<void>}
     */
    const fetchNotes = async() => {
        const apiData = await API.graphql({ query: listNotes });
        const notesFromAPI = apiData.data.listNotes.items;
        await Promise.all(notesFromAPI.map(async note => {
            // 画像が設定されている場合
            if (note.image) {
                const image = await Storage.get(note.image);
                note.image = image;
            }
            return note;
        }))
        setNotes(apiData.data.listNotes.items);
    }

    /**
     * ノートを作成
     * @return {Promise<void>}
     */
    const createNote = async() => {
        if (!formData.name || !formData.description) return;
        await API.graphql({ query: createNoteMutation, variables: { input: formData } });
        // 画像が設定されている場合
        if (formData.image) {
            const image = await Storage.get(formData.image);
            formData.image = image;
        }
        setNotes([ ...notes, formData ]);
        setFormData(initialFormState);
    }

    /**
     * ノートを削除
     * @param id
     * @return {Promise<void>}
     */
    const deleteNote = async({ id }) => {
        const newNotesArray = notes.filter(note => note.id !== id);
        setNotes(newNotesArray);
        await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
    }

    /**
     * 画像のアップロード
     * @param e
     * @return {Promise<void>}
     */
    const uploadImage = async(e) => {
        if (!e.target.files[0]) return
        const file = e.target.files[0];
        setFormData({ ...formData, image: file.name });
        await Storage.put(file.name, file);
        fetchNotes();
    }

    return (
        <div className="App">
            <h1>My Notes App</h1>
            <input
                onChange={e => setFormData({ ...formData, 'name': e.target.value})}
                placeholder="ノート名"
                value={formData.name}
            />
            <input
                onChange={e => setFormData({ ...formData, 'description': e.target.value})}
                placeholder="内容"
                value={formData.description}
            />
            <input
                type="file"
                onChange={uploadImage}
            />
            <button onClick={createNote}>Create Note</button>
            <div style={{marginBottom: 30}}>
                {
                    notes.map(note => (
                        <div key={note.id || note.name}>
                            <h2>{note.name}</h2>
                            <p>{note.description}</p>
                            <button onClick={() => deleteNote(note)}>Delete note</button>
                            {
                                note.image && <img src={note.image} style={{width: 400}} />
                            }
                        </div>
                    ))
                }
            </div>
            <AmplifySignOut />
        </div>
    );
}

export default withAuthenticator(App);