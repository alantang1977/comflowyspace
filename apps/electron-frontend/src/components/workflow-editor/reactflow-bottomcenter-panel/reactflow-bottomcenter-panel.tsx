import { Space, Tooltip, message } from "antd";
import styles from "./reactflow-bottomcenter-panel.style.module.scss";
import { WidgetPopover } from "./widget-tree/widget-tree-popover";
import { useAppStore } from "@comflowy/common/store";
import { memo, use, useCallback, useEffect, useRef, useState } from "react";
import { ExtensionIcon, GalleryIcon, PlusIcon, ReloadIcon, SelectionIcon, StartIcon, TerminalIcon } from "ui/icons";
import { ImageIcon, ModelIcon, PromptIcon, SamplerIcon, VaeIcon, WIDGET_ICONS, getWidgetIcon } from "../reactflow-node/reactflow-node-icons";
import { Widget } from "@comflowy/common/types";
import { ExtensionListPopover } from "@/lib/extensions/extensions-list-popover";
import { track } from "@/lib/tracker";
import { GlobalEvents, SlotGlobalEvent } from "@comflowy/common/utils/slot-event";
import { GalleryEntry } from "../reactflow-gallery/gallery";
import { QueueEntry } from "../reactflow-queue/reactflow-queue";
import { useQueueState } from "@comflowy/common/store/comfyui-queue-state";
import { isWindows } from "ui/utils/is-windows";
import { CreateSubflowNodeEntry } from "./create-subflow-node/create-subflow-node";

function ReactflowBottomCenterPanel() {
    const selectionMode = useAppStore(st => st.slectionMode);
    const onChangeSelectMode = useAppStore(st => st.onChangeSelectMode);
    return (
        <div className={styles.bottomCenterPanel}>
             <Space>
                <Tooltip title={"Toggle select mode"}>
                    <div className={`action action-select ${selectionMode === "figma" && "active"}`} onClick={ev => {
                        onChangeSelectMode(selectionMode === "figma" ? "default" : "figma");
                    }}>
                        <SelectionIcon/>
                    </div>
                </Tooltip>
                <Tooltip title={"Add new node"}>
                    <div className="action action-node-picker">
                        <WidgetPopover showCategory>
                            <Space>
                                <PlusIcon/>
                            </Space>
                        </WidgetPopover>
                    </div>
                </Tooltip>
                {process.env.NEXT_PUBLIC_FG_ENABLE_SUBFLOW === "enabled" && <CreateSubflowNodeEntry/>}
                <div className="spliter"></div>
                <ExtensionListPopover>
                    <div className="action action-open-extension">
                        <Space style={{transform: "scale(1.2)"}}>
                            <ExtensionIcon/>
                        </Space>
                    </div>
                </ExtensionListPopover>
                <Tooltip title={"ComfyUI Process Terminal"}>
                    <div className="action action-open-terminal" onClick={ev => {
                        SlotGlobalEvent.emit({
                            type: GlobalEvents.show_comfyprocess_manager,
                            data: null
                        })
                    }}>
                        <TerminalIcon />
                    </div>
                </Tooltip>
                <GalleryEntry/>
                <QueueEntry />
                <div className="spliter"></div>
                <RunButton/>
            </Space>
        </div>
    )
}

export default memo(ReactflowBottomCenterPanel)

export function RefreshPageButton() {
    const triggerSyncup = useCallback(async () => {
        document.location.reload();
    }, []);
    return (
        <Tooltip title={"Click to reload app"}>
            <div className="action action-refresh" onClick={triggerSyncup}>
                <ReloadIcon />
            </div>
        </Tooltip>
    )
}

export function RunButton() {
    const onSubmit = useAppStore(st => st.onSubmit);
    const onInterruptQueue = useQueueState(st => st.onInterruptQueue);
    // const queue = useQueueState(st => st.queue);
    const currentPromptId = useQueueState(st => st.currentPromptId);
    const queue = useQueueState(st => st.queue);
    const running = currentPromptId && currentPromptId !== "" && queue.queue_running.length > 0;

    const intervalId = useRef<number>()

    const doSubmit = async () => {
        // setRunning(true);
        const ret = await onSubmit();
        console.log("submit queue", ret);
        if (ret.error) {
            message.error(ret.error.error.message + " " + ret.error.error.details, 3)
        } else {
            message.info("Execution started, check the terminal for details.");
        }
        track("comfyui-execute-submit");
    }

    /**
     * key event
     */
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key === 'e') {
                doSubmit();
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [running]);


    const onQueueUpdate = useQueueState(st => st.onQueueUpdate);
    /**
     * interval to check run state
     */
    useEffect(() => {
        if (running) {
            intervalId.current = window.setInterval(() => {
                onQueueUpdate();
            }, 1000 * 3);
        } else {
            intervalId.current && window.clearInterval(intervalId.current);
            intervalId.current = undefined;
        }
        return () => {
            intervalId.current && window.clearInterval(intervalId.current);
            intervalId.current = undefined;
        }
    }, [running]);

    if (running) {
        return (
            <Tooltip title={"Click to stop execution"}>
                <div className="action action-stop" onClick={ev => {
                    // setRunning(false);
                    onInterruptQueue();
                }}>
                    <div className="stop-square"></div>
                </div>
            </Tooltip>
        )
    }

    return (
        <Tooltip title={`Click to run workflow (${getCommandString()})`}>
            <div className="action action-Run" onClick={ev => {
                doSubmit();
            }}>
                <StartIcon />
            </div>
        </Tooltip>
    )
}

function getCommandString() {
    if (isWindows()) {
        return '^Ctrl + e'
    } else {
        return '⌘Command + E'
    }
}