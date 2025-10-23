import { Disclosure, Transition } from "@headlessui/react";
import { ChevronUp } from "lucide-react";

type AccordionProps = {
    title: string;
    children: React.ReactNode;
};

export const Accordion = ({ title, children }: AccordionProps) => {
    return (
        <div className="w-full">
            <div className="w-full rounded-lg bg-white p-2 shadow-sm">
                <Disclosure>
                    {({ open }) => (
                        <>
                            <Disclosure.Button className="flex w-full justify-between rounded-lg bg-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring focus-visible:ring-blue-500 focus-visible:ring-opacity-75">
                                <span>{title}</span>
                                <ChevronUp
                                    className={`${
                                        open ? "rotate-180 transform" : ""
                                    } h-5 w-5 text-gray-500 transition-transform`}
                                />
                            </Disclosure.Button>
                            <Transition
                                enter="transition duration-100 ease-out"
                                enterFrom="transform scale-95 opacity-0"
                                enterTo="transform scale-100 opacity-100"
                                leave="transition duration-75 ease-out"
                                leaveFrom="transform scale-100 opacity-100"
                                leaveTo="transform scale-95 opacity-0"
                            >
                                <Disclosure.Panel className="px-4 pt-4 pb-2 text-sm text-gray-600">
                                    {children}
                                </Disclosure.Panel>
                            </Transition>
                        </>
                    )}
                </Disclosure>
            </div>
        </div>
    );
};
