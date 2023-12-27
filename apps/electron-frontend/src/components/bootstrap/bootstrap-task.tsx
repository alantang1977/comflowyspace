import { useRemoteTask } from "@/lib/utils/use-remote-task";
import { getBackendUrl } from "@comflowy/common/config";
import { BootStrapTaskType, useDashboardState } from "@comflowy/common/store/dashboard-state";
import { Alert, Button, message } from "antd";
import { useCallback, useEffect } from "react";
import {LogViewer} from "ui/log-viewer/log-viewer";
import useComfyUIProcessManagerState from "../comfyui-process-manager/comfyui-process-manager-state";

export type BootstrapTaskProps = {
  type: BootStrapTaskType,
}

export function BootstrapTask(props: BootstrapTaskProps) {
  const {loading, bootstrapTasks, setBootstrapTasks} = useDashboardState();
  const setMessages = useComfyUIProcessManagerState(state => state.setMessages);
  const task = bootstrapTasks.find(task => task.type === props.type);
  const {startTask, error, success, running, messages} = useRemoteTask({
      api: getBackendUrl(`/api/add_bootstrap_task`),
      onMessage: (msg) => {
        if (task.type === BootStrapTaskType.startComfyUI) {
          setMessages([...messages, msg.message || msg.error].map(msg => ({
            type: "START",
            message: msg
          })))
        }
        console.log(msg);
        if (msg.type === "SUCCESS") {
          if (task) {
            message.success(task.title + " success");
            task.finished = true;
            setBootstrapTasks([...bootstrapTasks]);
          }
        }
        if (msg.type === "FAILED") {
          message.error("Task failed: " + msg.error);
        }
      }
  });
  
  const startTaskAction = useCallback(() => {
    startTask({
      name: props.type 
    });
  }, []);

  useEffect(() => {
    startTaskAction();
  }, [])

  return (
    <div className={props.type}>
      {/* <div className="description">
        <Alert message={task.description} type="info"/>
      </div> */}
      <div className="actions">
        {success ? 
          (
            <div>{task.title} success</div>
          ) : (
            <Button loading={running} disabled={running} type="primary" onClick={ev => {
              startTaskAction();
            }}>{task.title}</Button>
          )
        }
      </div>
      {/* <LogViewer messages={messages}/> */}
    </div>
  )
}