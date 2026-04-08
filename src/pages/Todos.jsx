import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, onSnapshot, serverTimestamp } from "firebase/firestore";
import ConfirmationModal from "../components/ConfirmationModal";

const Todos = () => {
  const { currentUser } = useAuth();
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "users", currentUser.uid, "todos"));
    return onSnapshot(q, (snapshot) => {
      setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [currentUser]);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    await addDoc(collection(db, "users", currentUser.uid, "todos"), {
      text: newTodo,
      completed: false,
      createdAt: serverTimestamp()
    });
    setNewTodo("");
  };

  const toggleComplete = async (todo) => {
    const todoRef = doc(db, "users", currentUser.uid, "todos", todo.id);
    const newStatus = !todo.completed;
    await updateDoc(todoRef, { completed: newStatus });
    // await addXP(newStatus ? 5 : -5, 'int'); // Assuming addXP is imported
  };

  const deleteTodo = async (id) => {
    setDeleteId(id);
  };

  const filteredTodos = todos.filter(t => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  return (
    <div className="container py-4 mb-5">
      <h2 className="fw-bold mb-4">To-Do List</h2>
      
      <form onSubmit={addTodo} className="input-group mb-4">
        <input type="text" className="form-control rounded-4 border-0 shadow-sm" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} placeholder="Add a new task..." />
        <button className="btn btn-primary rounded-4 ms-2 shadow-sm"><i className="bi bi-plus-lg"></i></button>
      </form>

      <div className="list-group">
        {filteredTodos.map(todo => (
          <div key={todo.id} className="list-group-item d-flex align-items-center border-0 bg-white shadow-sm rounded-4 mb-2 p-3">
            <input type="checkbox" className="form-check-input me-3" checked={todo.completed} onChange={() => toggleComplete(todo)} />
            <span className={`flex-grow-1 ${todo.completed ? 'text-decoration-line-through text-muted' : ''}`}>{todo.text}</span>
            <button className="btn btn-link text-danger p-0" onClick={() => deleteTodo(todo.id)}>
              <i className="bi bi-trash"></i>
            </button>
          </div>
        ))}
      </div>

      <ConfirmationModal 
        show={!!deleteId} 
        title="Delete Task" 
        message="Are you sure you want to delete this task? This action cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          await deleteDoc(doc(db, "users", currentUser.uid, "todos", deleteId));
          setDeleteId(null);
        }}
      />
    </div>
  );
};

export default Todos;
