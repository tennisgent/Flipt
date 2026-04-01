import "./reload-prompt.css";

interface ReloadPromptProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const ReloadPrompt = ({ onUpdate, onDismiss }: ReloadPromptProps) => {
  return (
    <div className="reload-prompt">
      <p className="reload-prompt__text">A new version is available</p>
      <div className="reload-prompt__actions">
        <button className="reload-prompt__button reload-prompt__button--update" onClick={onUpdate}>
          Update
        </button>
        <button
          className="reload-prompt__button reload-prompt__button--dismiss"
          onClick={onDismiss}
        >
          Later
        </button>
      </div>
    </div>
  );
};
