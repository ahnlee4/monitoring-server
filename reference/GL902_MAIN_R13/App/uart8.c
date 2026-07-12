#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "delay.h"
#include "uart8.h"

extern UART_HandleTypeDef huart8;

void USART8_ISR(void)
{
    unsigned short rcv_length;
    unsigned char RxData;

    RxData = UART8->DR;
}
