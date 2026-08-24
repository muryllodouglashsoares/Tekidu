import { Link } from "react-router-dom";
import { Users, GraduationCap, FileText, CheckCircle, Shield, LineChart, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col font-sans">
      {/* Navbar */}
      <header className="border-b border-line bg-surface sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-700 text-white shadow-sm">
              <span className="font-bold">T</span>
            </div>
            <span className="font-display text-xl font-bold text-ink900">Tekidu</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#recursos" className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">Recursos</a>
            <a href="#perfis" className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">Perfis</a>
            <a href="#seguranca" className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">Segurança</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button>Entrar na plataforma</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-ink-50 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              <div className="sm:text-center md:mx-auto md:max-w-2xl lg:col-span-6 lg:text-left">
                <span className="inline-block rounded-full bg-ink-200 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-ink-700">
                  PLATAFORMA DE GESTÃO ESCOLAR
                </span>
                <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink900 sm:text-5xl lg:text-5xl xl:text-6xl">
                  Gestão escolar mais simples. <br className="hidden lg:block"/>
                  <span className="text-ink-700">Desenvolvimento estudantil</span> mais visível.
                </h1>
                <p className="mt-6 text-base text-ink-500 sm:text-lg">
                  O Tekidu centraliza informações acadêmicas e permite acompanhar o desempenho dos estudantes de forma organizada e eficiente, conectando escola, professores e alunos em um só lugar.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row gap-4 sm:justify-center lg:justify-start">
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full">Entrar na plataforma</Button>
                  </Link>
                  <a href="#recursos" className="inline-flex w-full sm:w-auto items-center justify-center rounded-full border border-line bg-surface px-8 py-3.5 text-base font-medium text-ink-600 shadow-sm hover:bg-ink-50 transition-colors">
                    Conhecer a plataforma
                  </a>
                </div>
              </div>

              {/* Hero Mockup */}
              <div className="relative mt-16 sm:mx-auto sm:max-w-lg lg:col-span-6 lg:mx-0 lg:mt-0 lg:flex lg:max-w-none lg:items-center">
                <div className="relative mx-auto w-full rounded-2xl bg-surface shadow-xl lg:max-w-md ring-1 ring-ink-200 overflow-hidden">
                  {/* Fake browser header */}
                  <div className="bg-ink-100 border-b border-line px-4 py-3 flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-danger/80"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                    <div className="h-3 w-3 rounded-full bg-success/80"></div>
                  </div>
                  <div className="p-6 bg-paper">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-surface p-2 rounded-lg border border-line shadow-sm text-ink-700">
                          <LayoutDashboard className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-ink900 text-sm">Dashboard da Turma</h3>
                          <p className="text-xs text-ink-500">3º Ano A • Matemática</p>
                        </div>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-ink-200 border border-surface flex items-center justify-center text-ink-700 font-bold text-xs shadow-sm">
                        P
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Metric Card 1 */}
                      <div className="rounded-xl border border-line p-4 bg-surface shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-medium text-ink-500">Média Geral da Turma</span>
                          <span className="text-sm font-bold text-success bg-success/10 px-2 py-0.5 rounded">8.2</span>
                        </div>
                        <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                          <div className="h-full bg-success w-[82%] rounded-full"></div>
                        </div>
                      </div>
                      {/* Metric Card 2 */}
                      <div className="rounded-xl border border-line p-4 bg-surface shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-medium text-ink-500">Frequência Média</span>
                          <span className="text-sm font-bold text-success bg-success/10 px-2 py-0.5 rounded">94%</span>
                        </div>
                        <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                          <div className="h-full bg-success w-[94%] rounded-full"></div>
                        </div>
                      </div>
                      {/* Mini cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl border border-line p-3 bg-surface shadow-sm flex items-center gap-3">
                          <div className="bg-ink-100 p-2 rounded-lg text-ink-700"><Users className="w-4 h-4"/></div>
                          <div>
                            <span className="block text-lg font-bold text-ink900">32</span>
                            <span className="text-[10px] text-ink-500 uppercase tracking-wide">Alunos</span>
                          </div>
                        </div>
                        <div className="rounded-xl border border-line p-3 bg-surface shadow-sm flex items-center gap-3">
                          <div className="bg-ink-100 p-2 rounded-lg text-ink-700"><FileText className="w-4 h-4"/></div>
                          <div>
                            <span className="block text-lg font-bold text-ink900">4</span>
                            <span className="text-[10px] text-ink-500 uppercase tracking-wide">Avaliações</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* O que é o Tekidu? */}
        <section className="py-20 bg-surface text-center px-4 border-b border-line">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-display font-bold text-ink900 mb-6">Tudo o que sua escola precisa em um só lugar.</h2>
            <p className="text-lg text-ink-500">
              O Tekidu centraliza informações acadêmicas, reduz a burocracia e facilita o acompanhamento da trajetória dos estudantes, entregando valor para a gestão, corpo docente e alunos.
            </p>
          </div>
        </section>

        {/* Recursos Principais */}
        <section id="recursos" className="py-24 bg-paper">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-display font-bold text-ink900">Recursos que transformam a gestão</h2>
              <p className="mt-4 text-ink-500 text-lg">Ferramentas projetadas para otimizar o dia a dia escolar.</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: "Gestão acadêmica", desc: "Organize alunos, turmas, disciplinas e informações acadêmicas em um único ambiente.", icon: Users },
                { title: "Notas e avaliações", desc: "Registre avaliações e acompanhe o desempenho acadêmico dos estudantes de forma simples.", icon: FileText },
                { title: "Frequência", desc: "Gerencie presença com agilidade e visualize indicadores consolidados de falta e presença.", icon: CheckCircle },
                { title: "Desenvolvimento estudantil", desc: "Acompanhe a evolução acadêmica por meio de indicadores visuais e análises gráficas.", icon: LineChart },
                { title: "Relatórios", desc: "Transforme os dados acadêmicos em informações úteis para acompanhamento e tomada de decisão.", icon: LayoutDashboard },
                { title: "Acesso por perfil", desc: "Cada usuário possui uma experiência segura e adequada ao seu papel dentro da instituição.", icon: Shield },
              ].map((feature, i) => (
                <div key={i} className="bg-surface rounded-2xl p-8 shadow-sm border border-line hover:border-ink-300 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-ink-50 flex items-center justify-center text-ink-700 mb-6 border border-line">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-ink900 mb-3">{feature.title}</h3>
                  <p className="text-ink-500 text-sm leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Perfis */}
        <section id="perfis" className="py-24 bg-surface">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-display font-bold text-ink900">Uma experiência para cada perfil</h2>
              <p className="mt-4 text-ink-500 text-lg max-w-2xl mx-auto">
                O Tekidu foi projetado para entregar a informação certa para a pessoa certa, 
                otimizando o fluxo de trabalho de toda a comunidade escolar.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative rounded-2xl border border-line bg-surface p-8 shadow-sm overflow-hidden text-center hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-ink-700"></div>
                <div className="mx-auto w-16 h-16 rounded-full bg-ink-50 border border-line flex items-center justify-center mb-6 text-ink-700">
                  <Shield className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-ink900 mb-3">Administrador</h3>
                <p className="text-ink-500 text-sm leading-relaxed">
                  Gerencie a estrutura acadêmica, usuários, turmas, disciplinas e informações da instituição.
                </p>
              </div>

              <div className="relative rounded-2xl border border-line bg-surface p-8 shadow-sm overflow-hidden text-center hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-ink-500"></div>
                <div className="mx-auto w-16 h-16 rounded-full bg-ink-50 border border-line flex items-center justify-center mb-6 text-ink-600">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-ink900 mb-3">Professor</h3>
                <p className="text-ink-500 text-sm leading-relaxed">
                  Gerencie avaliações, notas, frequência e acompanhe o desempenho individual dos seus estudantes.
                </p>
              </div>

              <div className="relative rounded-2xl border border-line bg-surface p-8 shadow-sm overflow-hidden text-center hover:shadow-md transition-shadow">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-ink-400"></div>
                <div className="mx-auto w-16 h-16 rounded-full bg-ink-50 border border-line flex items-center justify-center mb-6 text-ink-500">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold text-ink900 mb-3">Aluno</h3>
                <p className="text-ink-500 text-sm leading-relaxed">
                  Consulte seu boletim, frequência, disciplinas cursadas e acompanhe de perto sua evolução acadêmica.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Destaque Desenvolvimento */}
        <section className="py-24 bg-ink900 text-surface overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
              <div>
                <h2 className="text-3xl font-display font-bold mb-6">Desenvolvimento estudantil visível.</h2>
                <p className="text-ink-300 text-lg mb-8 leading-relaxed">
                  O Tekidu transforma dados acadêmicos em uma visão mais clara da evolução do estudante.
                  Através de indicadores visuais, fica fácil identificar quem precisa de apoio e quem está se destacando na turma.
                </p>
                <ul className="space-y-4">
                  {[
                    "Análise de desempenho contínuo",
                    "Acompanhamento de tendências",
                    "Visualização rápida de aprovação"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-ink-200 font-medium">
                      <div className="rounded-full bg-ink-700 p-1">
                        <CheckCircle className="h-4 w-4 text-surface" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-16 lg:mt-0 relative">
                <div className="absolute inset-0 bg-ink-700 blur-3xl opacity-20 rounded-full"></div>
                <div className="relative rounded-2xl bg-surface p-8 shadow-2xl border border-line text-ink900">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-ink-100 p-2 rounded-lg text-ink-700">
                      <LineChart className="h-5 w-5"/>
                    </div>
                    <h4 className="font-bold text-lg">Evolução do Estudante</h4>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Barras demonstrativas */}
                    <div className="flex items-end gap-3 h-40 border-b border-line pb-2 mt-8">
                      <div className="w-1/4 bg-ink-200 rounded-t-lg h-[40%] hover:bg-ink-300 transition-colors relative group">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink900 text-surface text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">4.0</div>
                      </div>
                      <div className="w-1/4 bg-ink-300 rounded-t-lg h-[60%] hover:bg-ink-400 transition-colors relative group">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink900 text-surface text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">6.0</div>
                      </div>
                      <div className="w-1/4 bg-success/60 rounded-t-lg h-[85%] hover:bg-success/80 transition-colors relative group">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink900 text-surface text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">8.5</div>
                      </div>
                      <div className="w-1/4 bg-success rounded-t-lg h-[95%] hover:bg-success transition-colors relative group">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-ink900 text-surface text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">9.5</div>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm text-ink-500 font-medium px-4">
                      <span>1º Bim</span>
                      <span>2º Bim</span>
                      <span>3º Bim</span>
                      <span>4º Bim</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Segurança */}
        <section id="seguranca" className="py-24 bg-paper">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 border border-line mb-6">
              <Shield className="h-8 w-8 text-ink-700" />
            </div>
            <h2 className="text-3xl font-display font-bold text-ink900 mb-4">Cada informação no lugar certo.</h2>
            <p className="text-lg text-ink-500 max-w-2xl mx-auto">
              O sistema conta com controle de acesso rigoroso baseado em papéis.
              Diferentes perfis possuem permissões específicas dentro da plataforma, 
              garantindo que os dados da instituição sejam gerenciados de maneira profissional e segura.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 bg-surface border-y border-line">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-display font-bold text-ink900 mb-6">Pronto para conhecer o Tekidu?</h2>
            <p className="text-lg text-ink-500 mb-10 max-w-2xl mx-auto">
              Acesse a plataforma e descubra como uma gestão acadêmica moderna pode transformar o dia a dia da sua escola.
            </p>
            <Link to="/login">
              <Button size="lg">Entrar na plataforma</Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-paper py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-700 text-white shadow-sm">
              <span className="font-bold">T</span>
            </div>
            <span className="font-display text-lg font-bold text-ink900">Tekidu</span>
          </div>
          <div className="text-sm text-ink-500">
            &copy; {new Date().getFullYear()} Tekidu. Plataforma de Gestão Escolar.
          </div>
          <div className="flex gap-6">
            <Link to="/login" className="text-sm font-medium text-ink-600 hover:text-ink-900 transition-colors">Acessar</Link>
            <a href="#recursos" className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">Recursos</a>
            <a href="#perfis" className="text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors">Perfis</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
