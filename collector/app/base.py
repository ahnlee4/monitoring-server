import abc

from app.models import CollectorBatch, ControlCommand


class BaseCollector(abc.ABC):
    @abc.abstractmethod
    def poll(self) -> CollectorBatch:
        raise NotImplementedError

    def execute_control_command(self, command: ControlCommand) -> None:
        raise NotImplementedError
