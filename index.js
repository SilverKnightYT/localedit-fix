import { patcher } from "@vendetta";
import { findByProps, findByStore } from "@vendetta/metro";
import { showInputTextModal } from "@vendetta/ui/alerts";

const FluxDispatcher = findByProps("dispatch", "isDispatching");
const MessageStore = findByStore("MessageStore");

let unpatches = [];

function editMessageLocally(channelId, messageId, newContent) {
  try {
    const rawMessage = MessageStore.getMessage(channelId, messageId);
    if (!rawMessage) return;

    const updatedMessage = Object.assign({}, rawMessage, {
      content: newContent,
      edited_timestamp: new Date().toISOString()
    });

    FluxDispatcher.dispatch({
      type: "MESSAGE_UPDATE",
      message: updatedMessage
    });
  } catch (err) {
    console.error("[LocalEdit] Local update error:", err);
  }
}

export default {
  onLoad: () => {
    const ActionSheetModule = findByProps("showSimpleActionSheet");

    if (ActionSheetModule) {
      unpatches.push(
        patcher.before(ActionSheetModule, "showSimpleActionSheet", (args) => {
          const [sheetConfig] = args;

          if (sheetConfig?.key === "MessageContextMenu" || sheetConfig?.options) {
            const message = sheetConfig?.header?.targetMessage || sheetConfig?.message;

            if (message) {
              sheetConfig.options.push({
                label: "Edit Message Locally",
                onPress: () => {
                  showInputTextModal({
                    title: "Edit Message Locally",
                    placeholder: "Enter new text...",
                    initialValue: message.content,
                    confirmText: "Save",
                    onConfirm: (newText) => {
                      editMessageLocally(message.channel_id, message.id, newText);
                    }
                  });
                }
              });
            }
          }
        })
      );
    }
  },

  onUnload: () => {
    unpatches.forEach((unpatch) => unpatch());
    unpatches = [];
  }
};
