import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const abortController = new AbortController();

    fetch('http://localhost:3001/api/items/' + id, { signal: abortController.signal })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(setItem)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch item:', err);
          navigate('/');
        }
      });

    return () => {
      abortController.abort();
    };
  }, [id, navigate]);

  if (!item) return <p>Loading...</p>;

  return (
    <div style={{padding: 16}}>
      <h2>{item.name}</h2>
      <p><strong>Category:</strong> {item.category}</p>
      <p><strong>Price:</strong> ${item.price}</p>
    </div>
  );
}

export default ItemDetail;
