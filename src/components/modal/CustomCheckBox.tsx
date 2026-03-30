// Library imports
import React from 'react';
import {Chip, tv} from '@heroui/react';
import {useCheckbox} from '@heroui/checkbox';
import {VisuallyHidden} from '@react-aria/visually-hidden';
import { Check } from 'lucide-react';

const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <Check {...props} strokeWidth={3} />
);

type CustomCheckBoxProps = {
  label           : string;
  className?       : string;
  defaultSelected?: boolean;
  onValueChange   : (value: boolean) => void;
};

const CustomCheckBox:React.FC<CustomCheckBoxProps> = ({ label,
                                                        className = '',
                                                        defaultSelected = false,
                                                        onValueChange,
                                                      }) => {
    // Initialize the checkbox using the useCheckbox hook
    const {
        isSelected,
        isFocusVisible,
        getBaseProps,
        getLabelProps,
        getInputProps,
    } = useCheckbox({
        defaultSelected,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          onValueChange(e.target.checked),
    });

    const checkbox = tv({
        slots: {
            base: "border-default hover:bg-default-200",
            content: "text-default-500",
        },
        variants: {
            isSelected: {
                true: {
                    base: "border-primary bg-primary hover:bg-primary-500 hover:border-primary-500",
                    content: "text-primary-foreground pl-1",
                },
            },
            isFocusVisible: {
                true: {
                    base: "outline-none ring-2 ring-focus ring-offset-2 ring-offset-background",
                },
            },
        },
    });

    const styles = checkbox({isSelected, isFocusVisible});

    return (
        <label {...getBaseProps()}
                className={`flex items-center h-8 ${className}`}>
          {/* Visually hidden input for accessibility */}
          <VisuallyHidden>
            <input {...getInputProps()} />
          </VisuallyHidden>
          {/* Display the Chip component with dynamic styling */}
          <Chip className={`${styles.base()} h-10 flex items-center`}
                color    = "accent"
                variant  = "secondary"
                {...getLabelProps()}
          >
            <span className={styles.content()}>
              {isSelected && <CheckIcon className="inline ml-1 w-4 h-4 mr-1" />}
              {label}
            </span>
          </Chip>
      </label>
    );
};
export default CustomCheckBox;
