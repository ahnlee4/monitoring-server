#include "stm32f4xx_hal.h"
#include "memory_map.h"
#include "delay.h"
#include "uart10.h"

extern UART_HandleTypeDef huart10;

void USART10_ISR(void)
{
    unsigned short rcv_length;
    unsigned char RxData;

    RxData = UART10->DR;

}
