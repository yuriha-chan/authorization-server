# Scope Agreement: Redis Stream Event Log

## 1. Dialogue Synthesis

The request aims to replace the mock Event Log in the frontend with real data from Redis streams:

- **Backend**: Create a Redis stream for event logging with a retention strategy (either 7 days or 1000 logs, whichever comes first). Implement a unified `notify` function that writes to the Redis stream AND broadcasts to WebSocket clients simultaneously.
- **Frontend**: Modify `loadData` to fetch event logs from the Redis stream API. Update the Event Log component incrementally via WebSocket messages.
- **API**: Add an endpoint to fetch event logs from the Redis stream.

## 2. Prove with Quotes

> ""Event Log" in the frontend is mock" (original request)
>
> "There should be redis stream for event logging (with proper log retention strategy 7d or 1k logs)" (original request)
>
> "The frontend loadData loads the redis stream on loadData and update on websocket event" (original request)
>
> "The redis stream writing occurs when the event triggers web socket notification (so it should be a function both trigers stream writing and websocket broadcast)" (original request)

## 3. Ubiquitous Language

- **Event Stream**: A Redis stream (`event:log`) that stores event log entries with automatic trimming based on retention policy (MAXLEN ~ 1000 or 7-day TTL)
- **Event Logger**: A unified function that atomically writes an event to the Redis stream and broadcasts it via WebSocket to all connected admin clients
- **Log Entry**: A structured record in the stream containing `{id, timestamp, type, message, data}`

## 4. Implementation Scope

### Backend Changes
1. `backend/src/events/logger.ts` - NEW: EventNotifier class with Redis stream integration and unified broadcast
2. `backend/src/admin/routes/events.ts` - NEW: API endpoint to fetch event logs from Redis stream
3. `backend/src/admin/server.ts` - Register the new events route
4. `backend/src/websocket/admin.ts` - Use EventNotifier for broadcasting instead of direct `manager.broadcast()`

### Frontend Changes
1. `frontend/src/api.js` - Add `getEventLogs()` API function
2. `frontend/src/App.jsx` - Modify `loadData` to fetch event logs, add additional WebSocket handler code for `broadcast` messages to update data for EventLog component

## 5. Validation

This agreement accurately reflects the vision:
- Redis stream with 7-day or 1k log retention
- Backend writes to stream AND broadcasts in one function
- Frontend loads from stream on init, updates incrementally via WebSocket
