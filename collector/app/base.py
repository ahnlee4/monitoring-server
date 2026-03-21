import abc

from app.models import TelemetryFrame


class BaseCollector(abc.ABC):
    @abc.abstractmethod
    def poll(self) -> list[TelemetryFrame]:
        raise NotImplementedError
