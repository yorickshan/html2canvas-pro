import { IPropertyIdentValueDescriptor, PropertyDescriptorParsingType } from '../property-descriptor';
import { Context } from '../../core/context';

export const enum WRITING_MODE {
    HORIZONTAL_TB = 0,
    VERTICAL_RL = 1,
    VERTICAL_LR = 2,
    SIDEWAYS_RL = 3,
    SIDEWAYS_LR = 4
}

export const isVerticalWritingMode = (writingMode: WRITING_MODE): boolean => writingMode !== WRITING_MODE.HORIZONTAL_TB;

export const isSidewaysWritingMode = (writingMode: WRITING_MODE): boolean =>
    writingMode === WRITING_MODE.SIDEWAYS_RL || writingMode === WRITING_MODE.SIDEWAYS_LR;

export const writingMode: IPropertyIdentValueDescriptor<WRITING_MODE> = {
    name: 'writing-mode',
    initialValue: 'horizontal-tb',
    prefix: false,
    type: PropertyDescriptorParsingType.IDENT_VALUE,
    parse: (_context: Context, writingMode: string): WRITING_MODE => {
        switch (writingMode) {
            case 'vertical-rl':
                return WRITING_MODE.VERTICAL_RL;
            case 'vertical-lr':
                return WRITING_MODE.VERTICAL_LR;
            case 'sideways-rl':
                return WRITING_MODE.SIDEWAYS_RL;
            case 'sideways-lr':
                return WRITING_MODE.SIDEWAYS_LR;
            case 'horizontal-tb':
            default:
                return WRITING_MODE.HORIZONTAL_TB;
        }
    }
};
