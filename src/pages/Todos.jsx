import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  onSnapshot, 
  serverTimestamp,
  orderBy 
} from "firebase/firestore";
import ConfirmationModal from "../components/ConfirmationModal";
import { CSSTransition, TransitionGroup } from "react-transition-group";

// Helper Component for Todo Item to handle nodeRef in React 19
const TodoItem = ({ todo, toggleComplete, setDeleteId, priorityColors }) => {
  const nodeRef = useRef(null);
  
  return (
    <CSSTransition nodeRef={nodeRef} timeout={300} classNames="fade">
      <div ref={nodeRef} className={`card border-0 shadow-sm rounded-4 mb-2 overflow-hidden ${todo.completed ? 'opacity-75' : ''}`}>
        <div className={`priority-indicator bg-${priorityColors[todo.priority || 'medium']}`} style={{ height: '3px' }}></div>
        <div className="card-body p-3 d-flex align-items-center">
          <div className="form-check m-0">
            <input 
              type="checkbox" 
              className="form-check-input border-2" 
              checked={todo.completed} 
              onChange={() => toggleComplete(todo)} 
              style={{ cursor: 'pointer', width: '20px', height: '20px' }}
            />
          </div>
          <div className="flex-grow-1 ms-3">
            <span className={`fw-bold d-block ${todo.completed ? 'text-decoration-line-through text-muted' : ''}`}>
              {todo.text}
            </span>
            <div className="d-flex gap-2 align-items-center mt-1">
              <span className={`badge bg-${priorityColors[todo.priority || 'medium']} bg-opacity-10 text-${priorityColors[todo.priority || 'medium']} border border-${priorityColors[todo.priority || 'medium']} border-opacity-25 small`} style={{ fontSize: '0.65rem' }}>
                {todo.priority?.toUpperCase() || 'MEDIUM'}
              </span>
              {todo.dueDate && (
                <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                  <i className="bi bi-calendar-event me-1"></i>
                  {new Date(todo.dueDate).toLocaleDateString()}
                </small>
              )}
            </div>
          </div>
          <button className="btn btn-link text-danger p-2" onClick={() => setDeleteId(todo.id)}>
            <i className="bi bi-trash3"></i>
          </button>
        </div>
      </div>
    </CSSTransition>
  );
};

const Todos = () => {
  const { currentUser, addXP } = useAuth();
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, "users", currentUser.uid, "todos"),
      orderBy("createdAt", "desc")
    );
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
      priority,
      dueDate: dueDate || null,
      createdAt: serverTimestamp()
    });
    
    setNewTodo("");
    setDueDate("");
    setPriority("medium");
  };

  const toggleComplete = async (todo) => {
    const todoRef = doc(db, "users", currentUser.uid, "todos", todo.id);
    const newStatus = !todo.completed;
    await updateDoc(todoRef, { completed: newStatus });
    
    if (newStatus) {
      let xpAmount = 5;
      if (todo.priority === 'high') xpAmount = 10;
      if (todo.priority === 'low') xpAmount = 2;
      
      // Bonus for meeting deadline
      if (todo.dueDate) {
        const deadline = new Date(todo.dueDate);
        if (deadline >= new Date()) xpAmount += 5;
      }
      
      addXP(xpAmount, 'int');
    }
  };

  const filteredTodos = useMemo(() => {
    return todos.filter(t => {
      const matchesFilter = filter === "all" ? true : filter === "active" ? !t.completed : t.completed;
      const matchesSearch = t.text.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [todos, filter, searchTerm]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [todos]);

  const priorityColors = {
    high: "danger",
    medium: "warning",
    low: "info"
  };

  return (
    <div className="container py-4 mb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold m-0">Tasks</h2>
        <div className="text-end">
          <span className="badge bg-primary rounded-pill">{stats.percent}% Complete</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress mb-4 rounded-pill shadow-sm" style={{ height: "10px" }}>
        <div 
          className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
          role="progressbar" 
          style={{ width: `${stats.percent}%` }}
        ></div>
      </div>
      
      {/* Search & Filter */}
      <div className="row g-2 mb-4">
        <div className="col-12 col-md-6">
          <div className="input-group shadow-sm rounded-4 overflow-hidden">
            <span className="input-group-text border-0 bg-white"><i className="bi bi-search text-muted"></i></span>
            <input 
              type="text" 
              className="form-control border-0" 
              placeholder="Search tasks..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-12 col-md-6 d-flex gap-2">
          {['all', 'active', 'completed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm rounded-pill flex-grow-1 fw-bold border ${filter === f ? 'btn-dark' : 'btn-light'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Add Task Form */}
      <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-light">
        <form onSubmit={addTodo}>
          <div className="input-group mb-2">
            <input 
              type="text" 
              className="form-control rounded-pill border-0 shadow-none ps-3" 
              value={newTodo} 
              onChange={(e) => setNewTodo(e.target.value)} 
              placeholder="What needs to be done?" 
            />
          </div>
          <div className="d-flex gap-2 align-items-center mt-2 px-1">
            <select 
              className="form-select form-select-sm rounded-pill border-0 w-auto shadow-none" 
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            <input 
              type="date" 
              className="form-control form-control-sm rounded-pill border-0 w-auto shadow-none"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <button className="btn btn-primary rounded-circle ms-auto shadow-sm" style={{ width: '38px', height: '38px' }}>
              <i className="bi bi-plus-lg"></i>
            </button>
          </div>
        </form>
      </div>

      {/* Todo List */}
      <div className="d-flex flex-column gap-2">
        {filteredTodos.length === 0 ? (
          <div className="text-center py-5 opacity-50">
            <i className="bi bi-clipboard-check fs-1"></i>
            <p className="mt-2">No tasks found.</p>
          </div>
        ) : (
          <TransitionGroup component={null}>
            {filteredTodos.map(todo => (
              <TodoItem 
                key={todo.id} 
                todo={todo} 
                toggleComplete={toggleComplete} 
                setDeleteId={setDeleteId} 
                priorityColors={priorityColors} 
              />
            ))}
          </TransitionGroup>
        )}
      </div>

      <ConfirmationModal 
        show={!!deleteId} 
        title="Delete Task" 
        message="Are you sure? Uncompleted tasks represent a loss of potential growth."
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
