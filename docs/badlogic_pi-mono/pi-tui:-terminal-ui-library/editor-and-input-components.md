# Editor & Input Components

<details>
<summary>Relevant source files</summary>

The following files were used as context for generating this wiki page:

- [packages/coding-agent/docs/terminal-setup.md](packages/coding-agent/docs/terminal-setup.md)
- [packages/coding-agent/docs/tmux.md](packages/coding-agent/docs/tmux.md)
- [packages/coding-agent/src/modes/interactive/components/custom-editor.ts](packages/coding-agent/src/modes/interactive/components/custom-editor.ts)
- [packages/tui/src/components/editor.ts](packages/tui/src/components/editor.ts)
- [packages/tui/src/components/input.ts](packages/tui/src/components/input.ts)
- [packages/tui/src/index.ts](packages/tui/src/index.ts)
- [packages/tui/src/keys.ts](packages/tui/src/keys.ts)
- [packages/tui/src/kill-ring.ts](packages/tui/src/kill-ring.ts)
- [packages/tui/src/undo-stack.ts](packages/tui/src/undo-stack.ts)
- [packages/tui/test/editor.test.ts](packages/tui/test/editor.test.ts)
- [packages/tui/test/input.test.ts](packages/tui/test/input.test.ts)
- [packages/tui/test/keys.test.ts](packages/tui/test/keys.test.ts)

</details>

This page documents the text editing components in the `pi-tui` library: the multi-line `Editor` component and single-line `Input` component. These components provide grapheme-aware text editing with features including word wrapping, history navigation, autocomplete, kill ring (Emacs-style cut/paste), undo/redo, and bracketed paste support.

For keyboard input parsing and protocol support, see [Keyboard Protocol & Input Handling](#5.4).  
For the component interface and overlay system, see [Component Interface & Overlays](#5.2).

---

## Component Architecture

Both `Editor` and `Input` implement the `Component` and `Focusable` interfaces from the TUI framework. They share common editing operations but differ in layout and complexity.

```mermaid
graph TB
    subgraph "Component Interfaces"
        Component["Component<br/>(render, handleInput, invalidate)"]
        Focusable["Focusable<br/>(focused: boolean)"]
    end

    subgraph "Editor Component"
        Editor["Editor<br/>Multi-line with word wrap"]
        EditorState["EditorState<br/>lines: string[]<br/>cursorLine: number<br/>cursorCol: number"]
        EditorFeatures["Features:<br/>- Word wrapping<br/>- Autocomplete<br/>- History navigation<br/>- Paste markers<br/>- Vertical scrolling"]
    end

    subgraph "Input Component"
        Input["Input<br/>Single-line with horizontal scroll"]
        InputState["InputState<br/>value: string<br/>cursor: number"]
        InputFeatures["Features:<br/>- Horizontal scrolling<br/>- Simpler rendering"]
    end

    subgraph "Shared Systems"
        KillRing["KillRing<br/>Emacs-style kill/yank buffer"]
        UndoStack["UndoStack<T><br/>Generic snapshot stack"]
        Keybindings["EditorKeybindingsManager<br/>Action mapping"]
        Segmenter["Intl.Segmenter<br/>Grapheme clustering"]
    end

    Component --> Editor
    Component --> Input
    Focusable --> Editor
    Focusable --> Input

    Editor --> EditorState
    Editor --> EditorFeatures

    Input --> InputState
    Input --> InputFeatures

    Editor --> KillRing
    Editor --> UndoStack
    Editor --> Keybindings
    Editor --> Segmenter

    Input --> KillRing
    Input --> UndoStack
    Input --> Keybindings
    Input --> Segmenter
```

**Sources:** [packages/tui/src/components/editor.ts:215-283](), [packages/tui/src/components/input.ts:18-45](), [packages/tui/src/tui.ts:5]()

---

## Editor Component

The `Editor` class provides a multi-line text editing experience with sophisticated features. It is the primary input component in pi's interactive mode.

### Text State & Cursor Management

The editor maintains state as an array of strings (lines) with a 2D cursor position:

```mermaid
graph LR
    subgraph "EditorState Structure"
        State["EditorState"]
        Lines["lines: string[]<br/>(logical lines)"]
        CursorLine["cursorLine: number<br/>(0-indexed line)"]
        CursorCol["cursorCol: number<br/>(byte offset in line)"]
    end

    State --> Lines
    State --> CursorLine
    State --> CursorCol

    subgraph "Cursor Management"
        SetCursorCol["setCursorCol(col: number)<br/>Clamps to grapheme boundaries"]
        ValidatePos["Ensures cursor within bounds"]
        PreferredCol["preferredVisualCol: number | null<br/>Sticky column for vertical movement"]
    end

    CursorCol --> SetCursorCol
    SetCursorCol --> ValidatePos
    SetCursorCol --> PreferredCol
```

The `cursorCol` field stores byte offsets, not grapheme counts, to handle multi-byte Unicode correctly. The `setCursorCol` method ensures the cursor never lands mid-grapheme.

**Sources:** [packages/tui/src/components/editor.ts:188-192](), [packages/tui/src/components/editor.ts:1178-1211]()

---

### Word Wrapping Algorithm

The editor uses grapheme-aware word wrapping that preserves word boundaries when possible:

```mermaid
graph TB
    Input["wordWrapLine(line, maxWidth, preSegmented?)"]

    CheckFit{"Line fits<br/>in maxWidth?"}
    SingleChunk["Return single TextChunk"]

    Segment["Segment into graphemes<br/>(with paste marker awareness)"]

    Loop["For each grapheme:"]
    CheckOverflow{"currentWidth + gWidth<br/>> maxWidth?"}

    WrapOpp{"Has wrap<br/>opportunity?"}
    BacktrackWrap["Backtrack to last whitespace<br/>Create chunk at wrapOppIndex"]
    ForceBreak["Force break at current position<br/>Create chunk at charIndex"]

    Advance["currentWidth += gWidth<br/>Track wrap opportunity"]

    RecordWrapOpp{"Is whitespace followed<br/>by non-whitespace?"}
    SaveWrapOpp["wrapOppIndex = next.index<br/>wrapOppWidth = currentWidth"]

    FinalChunk["Push final chunk"]
    Return["Return TextChunk[]"]

    Input --> CheckFit
    CheckFit -->|Yes| SingleChunk --> Return
    CheckFit -->|No| Segment --> Loop

    Loop --> CheckOverflow
    CheckOverflow -->|No| Advance
    CheckOverflow -->|Yes| WrapOpp

    WrapOpp -->|Yes| BacktrackWrap --> Loop
    WrapOpp -->|No| ForceBreak --> Loop

    Advance --> RecordWrapOpp
    RecordWrapOpp -->|Yes| SaveWrapOpp --> Loop
    RecordWrapOpp -->|No| Loop

    Loop -->|Done| FinalChunk --> Return
```

The algorithm tracks "wrap opportunities" (positions after whitespace before non-whitespace) and backtracks to them when overflow is detected. If backtracking doesn't help, it force-breaks mid-word.

**Key data structure:**

| Field        | Type     | Description                                     |
| ------------ | -------- | ----------------------------------------------- |
| `text`       | `string` | The wrapped text content                        |
| `startIndex` | `number` | Byte offset in original line where chunk starts |
| `endIndex`   | `number` | Byte offset in original line where chunk ends   |

**Sources:** [packages/tui/src/components/editor.ts:84-185](), [packages/tui/test/editor.test.ts:696-767]()

---

### Paste Handling & Markers

Large pastes (>10 lines or >1000 characters) are replaced with compact markers to avoid overwhelming the UI:

```mermaid
graph TB
    Paste["handlePaste(pastedText)"]

    Normalize["normalizeText()<br/>- Replace \\r\\
, \\r with \\
<br/>- Expand tabs to 4 spaces"]

    Filter["Filter non-printable chars<br/>(keep newlines)"]

    CheckSize{"Size > 10 lines<br/>OR > 1000 chars?"}

    CreateMarker["pasteCounter++<br/>pastes.set(pasteId, filteredText)<br/>marker = '[paste #N +X lines]'<br/>or '[paste #N X chars]'"]

    InsertMarker["insertTextAtCursorInternal(marker)"]

    InsertDirect["insertTextAtCursorInternal(filteredText)"]

    ExpandMarkers["getExpandedText()<br/>Replaces all markers with actual content"]

    Paste --> Normalize --> Filter --> CheckSize
    CheckSize -->|Yes| CreateMarker --> InsertMarker
    CheckSize -->|No| InsertDirect

    InsertMarker -.stored in.-> PasteMap["pastes: Map<number, string>"]
    PasteMap -.used by.-> ExpandMarkers
```

Paste markers are treated as atomic units by the segmenter, preventing cursor movement or deletion from splitting them:

```typescript
// Example markers:
'[paste #1 +123 lines]'
'[paste #2 1234 chars]'
```

**Marker-aware segmentation:** The `segmentWithMarkers` function wraps `Intl.Segmenter` and merges graphemes within valid paste markers into single segments. This ensures:

- Single backspace deletes entire marker
- Single arrow movement skips entire marker
- Word wrap treats marker as atomic unit

**Sources:** [packages/tui/src/components/editor.ts:12-78](), [packages/tui/src/components/editor.ts:1073-1126](), [packages/tui/src/components/editor.ts:905-920]()

---

### History Navigation

The editor maintains a prompt history for up/down arrow navigation, similar to shell history:

```mermaid
graph TB
    subgraph "History State"
        History["history: string[]<br/>(most recent first)"]
        HistoryIndex["historyIndex: number<br/>(-1 = not browsing)"]
    end

    subgraph "Add to History"
        Submit["onSubmit callback"]
        Add["addToHistory(text)<br/>- Trim whitespace<br/>- Skip empty/duplicates<br/>- Limit to 100 entries"]
    end

    subgraph "Navigation Logic"
        UpKey["Up Arrow"]
        DownKey["Down Arrow"]

        CheckEmpty{"Editor<br/>empty?"}
        CheckFirstLine{"On first<br/>visual line?"}

        BrowseUp["historyIndex++<br/>Show older entry"]
        BrowseDown["historyIndex--<br/>Show newer entry"]

        CursorMove["Normal cursor movement<br/>(within current content)"]

        ReturnCurrent["historyIndex = -1<br/>Clear editor"]
    end

    Submit --> Add --> History

    UpKey --> CheckEmpty
    CheckEmpty -->|Yes| BrowseUp
    CheckEmpty -->|No| CheckFirstLine
    CheckFirstLine -->|Yes| BrowseUp
    CheckFirstLine -->|No| CursorMove

    DownKey --> CheckFirstLine
    CheckFirstLine -->|Yes on last line| BrowseDown

    BrowseDown -->|historyIndex = -1| ReturnCurrent
```

**Behavior details:**

- History browsing only triggers when editor is empty OR cursor is on first/last visual line
- Otherwise, up/down arrows perform normal cursor movement within wrapped text
- Typing any character exits history mode and stays in the current content
- History limit is 100 entries, oldest entries dropped first

**Sources:** [packages/tui/src/components/editor.ts:254-256](), [packages/tui/src/components/editor.ts:326-374](), [packages/tui/src/components/editor.ts:742-764]()

---

### Autocomplete Integration

The editor supports pluggable autocomplete via the `AutocompleteProvider` interface:

```mermaid
graph TB
    subgraph "Autocomplete Provider"
        Provider["AutocompleteProvider"]
        GetCompletions["getCompletions(lines, cursorLine, cursorCol)<br/>→ { items, prefix }"]
        ApplyCompletion["applyCompletion(lines, cursorLine, cursorCol, item, prefix)<br/>→ { lines, cursorLine, cursorCol }"]
    end

    subgraph "Editor Integration"
        Trigger["Auto-trigger:<br/>- '/' at line start (slash commands)<br/>- '@' after whitespace (file refs)<br/>- Letters in slash/@ context"]

        State["autocompleteState: 'regular' | 'force' | null<br/>autocompletePrefix: string<br/>autocompleteList: SelectList"]

        HandleInput["handleInput(data)"]

        TabKey["Tab key"]
        EnterKey["Enter key"]
        EscKey["Escape key"]

        SelectItem["autocompleteList.getSelectedItem()"]
        ApplyItem["provider.applyCompletion()"]

        UpdateList["updateAutocomplete()<br/>Refresh items on typing"]
    end

    Provider --> GetCompletions
    Provider --> ApplyCompletion

    Trigger --> State
    State --> HandleInput

    HandleInput --> TabKey --> SelectItem --> ApplyItem
    HandleInput --> EnterKey --> SelectItem --> ApplyItem
    HandleInput --> EscKey --> CancelAutocomplete["cancelAutocomplete()"]
    HandleInput --> UpdateList

    GetCompletions -.provides items.-> State
    ApplyCompletion -.updates.-> State
```

**Autocomplete modes:**

- `regular`: Auto-triggered by typing, dismissed by Escape
- `force`: Explicitly triggered by Tab, persists through character edits
- `null`: Not showing

**Auto-trigger conditions:**

1. `/` at start of message → slash command completion
2. `@` after whitespace → file reference completion
3. Letters when inside slash/@ context → update completions

**Sources:** [packages/tui/src/components/editor.ts:238-244](), [packages/tui/src/components/editor.ts:1040-1071](), [packages/tui/src/components/editor.ts:1345-1412]()

---

### Scrolling

The editor implements vertical scrolling when content exceeds available space:

```mermaid
graph LR
    subgraph "Scroll State"
        ScrollOffset["scrollOffset: number<br/>(top visible line index)"]
        MaxVisible["maxVisibleLines<br/>= max(5, floor(rows * 0.3))"]
    end

    subgraph "Scroll Logic"
        CursorLineIdx["Find cursorLineIndex in layoutLines"]

        CheckAbove{"cursorLineIndex<br/>< scrollOffset?"}
        ScrollUp["scrollOffset = cursorLineIndex"]

        CheckBelow{"cursorLineIndex >=<br/>scrollOffset + maxVisibleLines?"}
        ScrollDown["scrollOffset = cursorLineIndex<br/>- maxVisibleLines + 1"]

        Clamp["Clamp to [0, maxScrollOffset]"]
    end

    subgraph "Render Indicators"
        TopBorder["scrollOffset > 0?<br/>Show '─── ↑ N more '"]
        BottomBorder["linesBelow > 0?<br/>Show '─── ↓ N more '"]
    end

    CursorLineIdx --> CheckAbove
    CheckAbove -->|Yes| ScrollUp --> Clamp
    CheckAbove -->|No| CheckBelow
    CheckBelow -->|Yes| ScrollDown --> Clamp

    Clamp --> TopBorder
    Clamp --> BottomBorder
```

The editor reserves 30% of terminal height for the editor (minimum 5 lines). Scroll indicators replace the top/bottom borders when content is clipped.

**Sources:** [packages/tui/src/components/editor.ts:233](), [packages/tui/src/components/editor.ts:411-448]()

---

## Input Component

The `Input` class provides single-line text editing with horizontal scrolling. It shares most editing operations with `Editor` but has a simpler state model:

```mermaid
graph TB
    subgraph "Input State"
        Value["value: string<br/>(single line)"]
        Cursor["cursor: number<br/>(byte offset)"]
    end

    subgraph "Horizontal Scrolling"
        CalcWindow["Calculate visible window:<br/>- availableWidth = width - prompt.length<br/>- Reserve 1 col for cursor at end"]

        CursorPos["cursorCol = visibleWidth(value[0:cursor])"]

        ScrollLogic{"Where is cursor?"}

        NearStart["startCol = 0<br/>(show from beginning)"]
        NearEnd["startCol = totalWidth - scrollWidth<br/>(show ending)"]
        Middle["startCol = cursorCol - halfWidth<br/>(center cursor)"]

        Slice["visibleText = sliceByColumn(value, startCol, scrollWidth)"]
    end

    Value --> CalcWindow
    Cursor --> CursorPos
    CalcWindow --> ScrollLogic
    CursorPos --> ScrollLogic

    ScrollLogic -->|cursorCol < halfWidth| NearStart --> Slice
    ScrollLogic -->|cursorCol > totalWidth - halfWidth| NearEnd --> Slice
    ScrollLogic -->|else| Middle --> Slice
```

**Rendering:** Input renders with a fixed `"> "` prompt prefix. The cursor is shown as reverse video (SGR 7).

**Sources:** [packages/tui/src/components/input.ts:10-45](), [packages/tui/src/components/input.ts:434-502]()

---

## Editing Operations

Both `Editor` and `Input` share common editing primitives:

### Grapheme-Aware Text Manipulation

All text operations use `Intl.Segmenter` to respect grapheme cluster boundaries:

| Operation         | Implementation                              | Grapheme Handling                                 |
| ----------------- | ------------------------------------------- | ------------------------------------------------- |
| Insert character  | `insertCharacter(char)`                     | Inserts at cursor byte offset                     |
| Delete backward   | `handleBackspace()`                         | Deletes last grapheme before cursor               |
| Delete forward    | `handleForwardDelete()`                     | Deletes first grapheme after cursor               |
| Cursor left/right | `moveCursor(0, ±1)`                         | Moves by grapheme, not byte                       |
| Word movement     | `moveWordBackwards()`, `moveWordForwards()` | Skips grapheme runs (word/punctuation/whitespace) |

**Grapheme examples:**

- `"ä"` (single code unit) → 1 grapheme
- `"😀"` (multi-byte emoji) → 1 grapheme
- `"👨‍👩‍👧"` (family emoji, multiple code points) → 1 grapheme

**Word boundary detection:**

```typescript
// Word classification (simplified)
isWhitespaceChar(g) // space, tab, newline
isPunctuationChar(g) // .,;:!?()[]{}
// Everything else is a word character
```

**Sources:** [packages/tui/src/components/editor.ts:1012-1071](), [packages/tui/src/components/editor.ts:1473-1575](), [packages/tui/src/utils.ts:60-82]()

---

### Kill Ring System

The kill ring implements Emacs-style kill/yank operations with accumulation:

```mermaid
graph TB
    subgraph "KillRing Structure"
        Ring["ring: string[]<br/>(circular buffer)"]
        Push["push(text, { prepend, accumulate })"]
        Peek["peek() → string | undefined"]
        Rotate["rotate()<br/>(move last to front)"]
    end

    subgraph "Kill Operations (save to ring)"
        CtrlK["Ctrl+K (deleteToLineEnd)<br/>Kills to end of line"]
        CtrlU["Ctrl+U (deleteToLineStart)<br/>Kills to start of line"]
        CtrlW["Ctrl+W (deleteWordBackward)<br/>Kills previous word"]
        AltD["Alt+D (deleteWordForward)<br/>Kills next word"]

        CheckAccumulate{"lastAction<br/>== 'kill'?"}
        Accumulate["Append/prepend to last entry"]
        NewEntry["Create new entry"]
    end

    subgraph "Yank Operations (retrieve from ring)"
        CtrlY["Ctrl+Y (yank)<br/>Insert most recent"]
        AltY["Alt+Y (yankPop)<br/>Replace with older entry"]

        CheckYankChain{"lastAction<br/>== 'yank'?"}
        RotateRing["Rotate ring<br/>Delete previous yank<br/>Insert new entry"]
        NoOp["No-op"]
    end

    CtrlK --> CheckAccumulate
    CtrlU --> CheckAccumulate
    CtrlW --> CheckAccumulate
    AltD --> CheckAccumulate

    CheckAccumulate -->|Yes| Accumulate --> Push
    CheckAccumulate -->|No| NewEntry --> Push

    Push --> Ring

    CtrlY --> Peek --> Ring
    AltY --> CheckYankChain
    CheckYankChain -->|Yes| RotateRing --> Rotate --> Ring
    CheckYankChain -->|No| NoOp
```

**Accumulation rules:**

- Consecutive kills accumulate into one ring entry
- Backward deletions (Ctrl+W, Ctrl+U) prepend to current entry
- Forward deletions (Alt+D, Ctrl+K) append to current entry
- Any non-kill action breaks accumulation

**Sources:** [packages/tui/src/kill-ring.ts:1-47](), [packages/tui/src/components/editor.ts:1603-1666](), [packages/tui/test/editor.test.ts:1866-2067]()

---

### Undo System

The undo system uses a generic stack with snapshot-based state storage:

```mermaid
graph LR
    subgraph "UndoStack<T>"
        Stack["stack: T[]<br/>(deep clones)"]
        Push["push(state: T)<br/>structuredClone()"]
        Pop["pop() → T | undefined"]
    end

    subgraph "Undo Triggers"
        Typing["Typing<br/>Coalesces word chars"]
        Space["Space<br/>Each space separate"]
        Delete["Delete/Backspace<br/>Each action separate"]
        Paste["Paste<br/>Atomic"]
        Kill["Kill operations<br/>Atomic"]
    end

    subgraph "Editor Undo"
        EditorState["EditorState snapshot:<br/>{ lines, cursorLine, cursorCol }"]
        PushUndo["pushUndoSnapshot()"]
        Undo["undo()<br/>Pop and restore state"]
    end

    subgraph "Input Undo"
        InputState["InputState snapshot:<br/>{ value, cursor }"]
        InputUndo["undo()<br/>Pop and restore state"]
    end

    Typing --> PushUndo
    Space --> PushUndo
    Delete --> PushUndo
    Paste --> PushUndo
    Kill --> PushUndo

    PushUndo --> Push --> Stack
    Undo --> Pop --> Stack

    EditorState --> PushUndo
    InputState --> PushUndo
```

**Coalescing logic:**

```typescript
// Consecutive word characters coalesce into one undo unit
if (isWhitespaceChar(char) || this.lastAction !== 'type-word') {
  this.pushUndoSnapshot()
}
this.lastAction = 'type-word'
```

Whitespace characters create separate undo units, allowing granular undo for spaces while keeping words atomic.

**Sources:** [packages/tui/src/undo-stack.ts:1-29](), [packages/tui/src/components/editor.ts:267-268](), [packages/tui/src/components/editor.ts:1012-1026](), [packages/tui/test/editor.test.ts:2069-2194]()

---

## Keyboard Handling

Both components use the `EditorKeybindingsManager` for action mapping:

```mermaid
graph TB
    subgraph "Keybinding System"
        Manager["EditorKeybindingsManager"]
        Config["EditorKeybindingsConfig<br/>Action → KeyId[]"]
        Matches["matches(data, action) → boolean"]
    end

    subgraph "Editor Actions"
        Submit["submit: ['enter']"]
        NewLine["newLine: ['shift+enter', 'alt+enter']"]
        DeleteCharBack["deleteCharBackward: ['backspace']"]
        DeleteWordBack["deleteWordBackward: ['ctrl+w', 'alt+backspace']"]
        CursorMove["cursorUp, cursorDown, cursorLeft, cursorRight"]
        WordMove["cursorWordLeft: ['alt+left', 'ctrl+left']<br/>cursorWordRight: ['alt+right', 'ctrl+right']"]
        Kill["deleteToLineEnd: ['ctrl+k']<br/>deleteToLineStart: ['ctrl+u']"]
        Yank["yank: ['ctrl+y']<br/>yankPop: ['alt+y']"]
        Undo["undo: ['ctrl+-', 'ctrl+/']"]
    end

    subgraph "Input Flow"
        HandleInput["handleInput(data)"]

        CheckAutocomplete{"Autocomplete<br/>active?"}
        AutocompleteKeys["Handle Tab, Enter, Escape, Up/Down"]

        CheckAction["For each action:<br/>if kb.matches(data, action)"]
        Execute["Execute action handler"]

        PrintableChar{"data.charCodeAt(0)<br/>>= 32?"}
        InsertChar["insertCharacter(data)"]
    end

    Config --> Manager
    Manager --> Matches
    Matches --> CheckAction

    HandleInput --> CheckAutocomplete
    CheckAutocomplete -->|Yes| AutocompleteKeys
    CheckAutocomplete -->|No| CheckAction

    CheckAction --> Execute
    CheckAction -->|No match| PrintableChar
    PrintableChar -->|Yes| InsertChar
```

**Special key handling:**

- Bracketed paste (`\x1b[200~...content...\x1b[201~`) is buffered and processed atomically
- Kitty protocol printables (`\x1b[<codepoint>u`) are decoded before action matching
- Control characters are rejected except for defined keybindings

**Sources:** [packages/tui/src/keybindings.ts:1-200](), [packages/tui/src/components/editor.ts:519-811](), [packages/tui/src/components/input.ts:47-210]()

---

## Rendering

Both components implement the `Component.render(width: number): string[]` interface:

### Editor Rendering

```mermaid
graph TB
    Render["render(width)"]

    CalcPadding["Calculate paddingX:<br/>min(this.paddingX, floor((width-1)/2))"]
    CalcContentWidth["contentWidth = width - paddingX*2<br/>layoutWidth = contentWidth - (paddingX ? 0 : 1)"]

    Layout["layoutText(layoutWidth)<br/>→ LayoutLine[]"]

    WrapLines["For each logical line:<br/>- If fits: single LayoutLine<br/>- Else: wordWrapLine() → chunks"]

    MarkCursor["Mark which LayoutLine has cursor<br/>and cursor position within line"]

    CalcScroll["maxVisibleLines = max(5, floor(rows*0.3))<br/>Adjust scrollOffset to show cursor"]

    BuildOutput["For each visible LayoutLine:<br/>- Insert cursor marker (CURSOR_MARKER)<br/>- Highlight cursor char (SGR 7)<br/>- Add padding"]

    Borders["Add borders:<br/>- Top: '───' or '─── ↑ N more '<br/>- Bottom: '───' or '─── ↓ N more '"]

    Autocomplete["If autocomplete active:<br/>Append SelectList render output"]

    Render --> CalcPadding --> CalcContentWidth --> Layout
    Layout --> WrapLines --> MarkCursor
    MarkCursor --> CalcScroll --> BuildOutput --> Borders --> Autocomplete
```

**Cursor rendering:** The editor emits `CURSOR_MARKER` (zero-width special character) before the fake cursor to position the hardware cursor for IME (Input Method Editor) support.

### Input Rendering

```mermaid
graph TB
    Render["render(width)"]

    CalcWindow["availableWidth = width - prompt.length<br/>Calculate visible window with scrolling"]

    Slice["sliceByColumn(value, startCol, scrollWidth)"]

    InsertCursor["Insert cursor:<br/>- If on char: highlight it (SGR 7)<br/>- If at end: add highlighted space"]

    Padding["Add padding to fill availableWidth"]

    Render --> CalcWindow --> Slice --> InsertCursor --> Padding
```

**Sources:** [packages/tui/src/components/editor.ts:394-517](), [packages/tui/src/components/input.ts:434-502](), [packages/tui/src/tui.ts:24-26]()
